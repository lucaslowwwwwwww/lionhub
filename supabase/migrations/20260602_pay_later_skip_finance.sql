-- ============================================================
-- MIGRATION: pay_later_skip_finance
-- When payment method is 'Pay Later', skip finance record creation
-- and don't count towards totalrevenue. When payment is updated
-- later (re-calling complete_stop with Cash/Bank In), the finance
-- record is created and revenue counted at that point.
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_stop(
  p_stop_id text,
  p_actual_amount numeric,
  p_payment_method text DEFAULT 'Cash'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_stop record;
  v_itin record;
  v_old_status text;
  v_old_payment_method text;
  v_now timestamptz := now();
  v_completed_delta int := 0;
  v_skipped_delta int := 0;
  v_rev_delta numeric := 0;
  v_fin_id text;
  v_caller_org text;
  v_is_pay_later boolean := (p_payment_method = 'Pay Later');
  v_was_pay_later boolean;
BEGIN
  v_caller_org := internal.get_auth_org_id();

  SELECT * INTO v_stop FROM stops WHERE id = p_stop_id::uuid;
  IF v_stop IS NULL THEN RAISE EXCEPTION 'Stop not found'; END IF;
  IF v_stop.org_id::text != v_caller_org AND NOT internal.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: stop belongs to different org';
  END IF;

  v_old_status := COALESCE(v_stop.status, 'pending');
  v_old_payment_method := COALESCE(v_stop.paymentmethod, '');
  v_was_pay_later := (v_old_payment_method = 'Pay Later');

  -- Update stop
  UPDATE stops SET
    status = 'completed',
    actualamount = p_actual_amount,
    paymentmethod = p_payment_method,
    completedat = CASE
      -- Preserve original completion time if already completed (e.g. updating payment later)
      WHEN v_old_status = 'completed' THEN completedat
      ELSE v_now
    END,
    updatedat = v_now
  WHERE id = p_stop_id::uuid;

  -- Calculate deltas
  IF v_old_status = 'completed' THEN
    -- Re-completing: only count revenue delta if transitioning payment states
    IF v_was_pay_later AND NOT v_is_pay_later THEN
      -- Was "Pay Later", now actually paid → add revenue
      v_rev_delta := p_actual_amount;
    ELSIF NOT v_was_pay_later AND v_is_pay_later THEN
      -- Was paid, now changed to "Pay Later" → remove revenue
      v_rev_delta := -COALESCE(v_stop.actualamount, 0);
    ELSIF NOT v_was_pay_later AND NOT v_is_pay_later THEN
      -- Normal re-completion (amount adjustment)
      v_rev_delta := p_actual_amount - COALESCE(v_stop.actualamount, 0);
    END IF;
    -- If was pay later AND still pay later → no revenue change
  ELSE
    -- First completion
    v_completed_delta := 1;
    IF NOT v_is_pay_later THEN
      v_rev_delta := p_actual_amount;
    END IF;
    -- Pay Later on first completion → no revenue counted
  END IF;
  IF v_old_status = 'skipped' THEN v_skipped_delta := -1; END IF;

  -- Update itinerary counters atomically
  UPDATE itineraries SET
    completedstops = GREATEST(0, completedstops + v_completed_delta),
    skippedstops = GREATEST(0, skippedstops + v_skipped_delta),
    totalrevenue = GREATEST(0, totalrevenue + v_rev_delta),
    updatedat = v_now
  WHERE id = v_stop.itinerary_id;

  -- Sync finance record
  v_fin_id := 'FIN_' || COALESCE(v_stop.scheduleddate, to_char(v_now, 'YYYY-MM-DD')) || '_' || p_stop_id;

  IF v_is_pay_later THEN
    -- Pay Later: DELETE any existing finance record (in case it was previously paid)
    DELETE FROM finance WHERE sourcestopid = p_stop_id::uuid AND org_id = v_stop.org_id;
  ELSIF p_actual_amount > 0 THEN
    -- Actually paid: create/update finance record
    INSERT INTO finance (id, type, amount, category, date, description, paymentmethod, troupeid, org_id, sourcestopid, createdat)
    SELECT v_fin_id, 'income', p_actual_amount, 'Performances',
           COALESCE(v_stop.scheduleddate, to_char(v_now, 'YYYY-MM-DD')),
           'Performance: ' || COALESCE(v_stop.householdname, 'Standard Performance') || ' (' || COALESCE(i.troupename, 'Unknown') || ')',
           p_payment_method, i.troupeid::text, v_stop.org_id, p_stop_id::uuid, v_now
    FROM itineraries i WHERE i.id = v_stop.itinerary_id
    ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      paymentmethod = EXCLUDED.paymentmethod,
      description = EXCLUDED.description;
  ELSE
    DELETE FROM finance WHERE sourcestopid = p_stop_id::uuid AND org_id = v_stop.org_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'stop_id', p_stop_id, 'old_status', v_old_status);
END;
$fn$;
