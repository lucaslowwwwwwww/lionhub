-- ============================================================
-- MIGRATION: atomic_itinerary_rpcs_and_indexes
-- Atomic RPCs for multi-table itinerary operations to prevent
-- counter/finance desync under concurrent users or partial failures.
-- ============================================================

-- 1. ATOMIC: complete_stop
-- Updates stop status, itinerary counters, and finance in one transaction
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
  v_now timestamptz := now();
  v_completed_delta int := 0;
  v_skipped_delta int := 0;
  v_rev_delta numeric := 0;
  v_fin_id text;
  v_caller_org text;
BEGIN
  v_caller_org := internal.get_auth_org_id();

  SELECT * INTO v_stop FROM stops WHERE id = p_stop_id::uuid;
  IF v_stop IS NULL THEN RAISE EXCEPTION 'Stop not found'; END IF;
  IF v_stop.org_id::text != v_caller_org AND NOT internal.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: stop belongs to different org';
  END IF;

  v_old_status := COALESCE(v_stop.status, 'pending');

  -- Update stop
  UPDATE stops SET
    status = 'completed',
    actualamount = p_actual_amount,
    paymentmethod = p_payment_method,
    completedat = v_now,
    updatedat = v_now
  WHERE id = p_stop_id::uuid;

  -- Calculate deltas
  IF v_old_status = 'completed' THEN
    v_rev_delta := p_actual_amount - COALESCE(v_stop.actualamount, 0);
  ELSE
    v_completed_delta := 1;
    v_rev_delta := p_actual_amount;
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

  IF p_actual_amount > 0 THEN
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

GRANT EXECUTE ON FUNCTION public.complete_stop(text, numeric, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_stop(text, numeric, text) FROM anon, public;

-- 2. ATOMIC: update_stop_status
-- For non-completion status changes (pending, performing, skipped)
CREATE OR REPLACE FUNCTION public.update_stop_status(
  p_stop_id text,
  p_new_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_stop record;
  v_old_status text;
  v_now timestamptz := now();
  v_completed_delta int := 0;
  v_skipped_delta int := 0;
  v_rev_delta numeric := 0;
  v_caller_org text;
BEGIN
  IF p_new_status NOT IN ('pending', 'performing', 'skipped', 'in-progress') THEN
    RAISE EXCEPTION 'Invalid status. Use complete_stop for completion.';
  END IF;

  v_caller_org := internal.get_auth_org_id();

  SELECT * INTO v_stop FROM stops WHERE id = p_stop_id::uuid;
  IF v_stop IS NULL THEN RAISE EXCEPTION 'Stop not found'; END IF;
  IF v_stop.org_id::text != v_caller_org AND NOT internal.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: stop belongs to different org';
  END IF;

  v_old_status := COALESCE(v_stop.status, 'pending');
  IF v_old_status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'no_change', true);
  END IF;

  -- Update stop
  UPDATE stops SET
    status = p_new_status,
    performancestartedat = CASE WHEN p_new_status = 'performing' THEN v_now ELSE performancestartedat END,
    updatedat = v_now
  WHERE id = p_stop_id::uuid;

  -- Calculate deltas
  IF v_old_status = 'completed' THEN
    v_completed_delta := -1;
    v_rev_delta := -COALESCE(v_stop.actualamount, 0);
    -- Remove finance record
    DELETE FROM finance WHERE sourcestopid = p_stop_id::uuid AND org_id = v_stop.org_id;
  END IF;
  IF v_old_status = 'skipped' THEN v_skipped_delta := -1; END IF;
  IF p_new_status = 'skipped' THEN v_skipped_delta := v_skipped_delta + 1; END IF;

  -- Update itinerary counters
  IF v_completed_delta != 0 OR v_skipped_delta != 0 OR v_rev_delta != 0 THEN
    UPDATE itineraries SET
      completedstops = GREATEST(0, completedstops + v_completed_delta),
      skippedstops = GREATEST(0, skippedstops + v_skipped_delta),
      totalrevenue = GREATEST(0, totalrevenue + v_rev_delta),
      updatedat = v_now
    WHERE id = v_stop.itinerary_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'stop_id', p_stop_id, 'old_status', v_old_status, 'new_status', p_new_status);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.update_stop_status(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.update_stop_status(text, text) FROM anon, public;

-- 3. ATOMIC: delete_stop
CREATE OR REPLACE FUNCTION public.delete_stop(p_stop_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_stop record;
  v_now timestamptz := now();
  v_completed_delta int := 0;
  v_skipped_delta int := 0;
  v_rev_delta numeric := 0;
  v_caller_org text;
BEGIN
  v_caller_org := internal.get_auth_org_id();

  SELECT * INTO v_stop FROM stops WHERE id = p_stop_id::uuid;
  IF v_stop IS NULL THEN RAISE EXCEPTION 'Stop not found'; END IF;
  IF v_stop.org_id::text != v_caller_org AND NOT internal.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Calculate deltas before deletion
  IF v_stop.status = 'completed' THEN
    v_completed_delta := -1;
    v_rev_delta := -COALESCE(v_stop.actualamount, 0);
  ELSIF v_stop.status = 'skipped' THEN
    v_skipped_delta := -1;
  END IF;

  -- Delete finance records for this stop (org-scoped)
  DELETE FROM finance WHERE sourcestopid = p_stop_id::uuid AND org_id = v_stop.org_id;

  -- Delete the stop
  DELETE FROM stops WHERE id = p_stop_id::uuid;

  -- Update itinerary counters
  UPDATE itineraries SET
    totalstops = GREATEST(0, totalstops - 1),
    completedstops = GREATEST(0, completedstops + v_completed_delta),
    skippedstops = GREATEST(0, skippedstops + v_skipped_delta),
    totalrevenue = GREATEST(0, totalrevenue + v_rev_delta),
    updatedat = v_now
  WHERE id = v_stop.itinerary_id;

  RETURN jsonb_build_object('success', true, 'deleted_stop', p_stop_id);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.delete_stop(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_stop(text) FROM anon, public;

-- 4. ATOMIC: delete_full_itinerary
CREATE OR REPLACE FUNCTION public.delete_full_itinerary(p_itinerary_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_itin record;
  v_caller_org text;
  v_stop_ids text[];
BEGIN
  v_caller_org := internal.get_auth_org_id();

  SELECT * INTO v_itin FROM itineraries WHERE id = p_itinerary_id;
  IF v_itin IS NULL THEN RAISE EXCEPTION 'Itinerary not found'; END IF;
  IF v_itin.org_id::text != v_caller_org AND NOT internal.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT array_agg(id) INTO v_stop_ids FROM stops WHERE itinerary_id = p_itinerary_id;

  IF v_stop_ids IS NOT NULL THEN
    DELETE FROM finance WHERE sourcestopid = ANY(v_stop_ids) AND org_id = v_itin.org_id;
  END IF;

  DELETE FROM stops WHERE itinerary_id = p_itinerary_id;
  DELETE FROM itineraries WHERE id = p_itinerary_id;

  RETURN jsonb_build_object('success', true, 'deleted_itinerary', p_itinerary_id, 'stops_deleted', COALESCE(array_length(v_stop_ids, 1), 0));
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.delete_full_itinerary(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_full_itinerary(text) FROM anon, public;

-- 5. ATOMIC: add_stop
CREATE OR REPLACE FUNCTION public.add_stop(
  p_itinerary_id text,
  p_stop_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_itin record;
  v_caller_org text;
  v_now timestamptz := now();
  v_new_order int;
  v_new_stop record;
BEGIN
  v_caller_org := internal.get_auth_org_id();

  SELECT * INTO v_itin FROM itineraries WHERE id = p_itinerary_id;
  IF v_itin IS NULL THEN RAISE EXCEPTION 'Itinerary not found'; END IF;
  IF v_itin.org_id::text != v_caller_org AND NOT internal.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(MAX("order"), -1) + 1 INTO v_new_order FROM stops WHERE itinerary_id = p_itinerary_id;

  INSERT INTO stops (
    itinerary_id, org_id, "order", status,
    householdname, address, phone, amount, scheduledtime, scheduleddate,
    lionquantity, lioncolor, hasgodofwealth, hasbigheadbuddha,
    extra_characters, pluckingtype, remarks, duration, maplink,
    createdby, createdat, updatedat
  ) VALUES (
    p_itinerary_id, v_itin.org_id, v_new_order, 'pending',
    p_stop_data->>'householdname', p_stop_data->>'address', p_stop_data->>'phone',
    (p_stop_data->>'amount')::numeric, p_stop_data->>'scheduledtime', p_stop_data->>'scheduleddate',
    (p_stop_data->>'lionquantity')::int, 
    COALESCE((p_stop_data->'lioncolor'), '[]'::jsonb),
    COALESCE((p_stop_data->>'hasgodofwealth')::boolean, false),
    COALESCE((p_stop_data->>'hasbigheadbuddha')::boolean, false),
    CASE WHEN p_stop_data ? 'extra_characters' THEN (p_stop_data->'extra_characters') ELSE '[]'::jsonb END,
    COALESCE((p_stop_data->'pluckingtype'), '[]'::jsonb), 
    p_stop_data->>'remarks',
    (p_stop_data->>'duration')::int, p_stop_data->>'maplink',
    p_stop_data->>'createdby', v_now, v_now
  )
  RETURNING * INTO v_new_stop;

  UPDATE itineraries SET totalstops = totalstops + 1, updatedat = v_now WHERE id = p_itinerary_id;

  RETURN jsonb_build_object('success', true, 'stop_id', v_new_stop.id, 'order', v_new_order);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.add_stop(text, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.add_stop(text, jsonb) FROM anon, public;

-- 6. ATOMIC: transfer_stop
CREATE OR REPLACE FUNCTION public.transfer_stop(
  p_stop_id text,
  p_target_troupe_id text,
  p_target_troupe_name text,
  p_date text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_stop record;
  v_source_itin_id text;
  v_target_itin_id text;
  v_target_itin record;
  v_caller_org text;
  v_now timestamptz := now();
  v_target_order int;
  v_completed_delta int := 0;
  v_skipped_delta int := 0;
  v_rev_delta numeric := 0;
BEGIN
  v_caller_org := internal.get_auth_org_id();

  SELECT * INTO v_stop FROM stops WHERE id = p_stop_id::uuid;
  IF v_stop IS NULL THEN RAISE EXCEPTION 'Stop not found'; END IF;
  IF v_stop.org_id::text != v_caller_org AND NOT internal.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_source_itin_id := v_stop.itinerary_id;
  v_target_itin_id := p_date || '_' || p_target_troupe_id;

  SELECT * INTO v_target_itin FROM itineraries WHERE id = v_target_itin_id;
  IF v_target_itin IS NULL THEN
    INSERT INTO itineraries (id, troupeid, troupename, date, status, attendance, attendancedetails,
                             totalstops, completedstops, skippedstops, totalrevenue, org_id, createdat)
    VALUES (v_target_itin_id, p_target_troupe_id::uuid, COALESCE(p_target_troupe_name, 'Unknown'),
            p_date, 'published', '[]'::jsonb, '{}'::jsonb, 0, 0, 0, 0,
            v_stop.org_id, v_now)
    RETURNING * INTO v_target_itin;
  END IF;

  IF v_stop.status = 'completed' THEN
    v_completed_delta := 1; v_rev_delta := COALESCE(v_stop.actualamount, 0);
  ELSIF v_stop.status = 'skipped' THEN
    v_skipped_delta := 1;
  END IF;

  SELECT COALESCE(MAX("order"), -1) + 1 INTO v_target_order FROM stops WHERE itinerary_id = v_target_itin_id;

  UPDATE stops SET itinerary_id = v_target_itin_id, "order" = v_target_order, updatedat = v_now
  WHERE id = p_stop_id::uuid;

  UPDATE itineraries SET
    totalstops = GREATEST(0, totalstops - 1),
    completedstops = GREATEST(0, completedstops - v_completed_delta),
    skippedstops = GREATEST(0, skippedstops - v_skipped_delta),
    totalrevenue = GREATEST(0, totalrevenue - v_rev_delta),
    updatedat = v_now
  WHERE id = v_source_itin_id;

  UPDATE itineraries SET
    totalstops = totalstops + 1,
    completedstops = completedstops + v_completed_delta,
    skippedstops = skippedstops + v_skipped_delta,
    totalrevenue = totalrevenue + v_rev_delta,
    updatedat = v_now
  WHERE id = v_target_itin_id;

  IF v_stop.status = 'completed' THEN
    UPDATE finance SET
      troupeid = p_target_troupe_id,
      description = 'Performance: ' || COALESCE(v_stop.householdname, 'Standard Performance') || ' (' || COALESCE(p_target_troupe_name, 'Unknown') || ')'
    WHERE sourcestopid = p_stop_id::uuid AND org_id = v_stop.org_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'stop_id', p_stop_id, 'target_itinerary', v_target_itin_id);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.transfer_stop(text, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.transfer_stop(text, text, text, text) FROM anon, public;

-- 7. Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_finance_org_troupeid ON public.finance (org_id, troupeid);
CREATE INDEX IF NOT EXISTS idx_stops_itin_order ON public.stops (itinerary_id, "order");
