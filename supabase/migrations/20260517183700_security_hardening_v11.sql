-- ============================================================
-- MIGRATION: security_hardening_v11
-- Critical security fixes found during Prompt 2 review:
--   1. Replace {public} role policies with {authenticated}
--   2. Add protect_org_fields trigger to block tenant billing escalation
--   3. Fix super_admin_toggle_org_status to error on missing org
--   4. Fix handle_new_master_user for duplicate email across orgs
--   5. Record auth.users trigger in source-controlled SQL
--   6. Drop old permissive branding storage policies
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. REPLACE {public}-role policies with {authenticated}
--    These policies used roles="{public}" which allows the anon
--    key to attempt queries. While internal.get_auth_org_id()
--    returns null for anon, this is an unnecessary attack surface.
--    We drop each old policy and recreate with TO authenticated.
-- ──────────────────────────────────────────────────────────────

-- billing_docs
DROP POLICY IF EXISTS "billing_docs_modify_v8" ON public.billing_docs;
DROP POLICY IF EXISTS "billing_docs_select_v8" ON public.billing_docs;

CREATE POLICY "billing_docs_modify_v11" ON public.billing_docs
  FOR ALL TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  )
  WITH CHECK (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  );

CREATE POLICY "billing_docs_select_v11" ON public.billing_docs
  FOR SELECT TO authenticated
  USING (
    internal.is_super_admin()
    OR org_id::text = internal.get_auth_org_id()
  );

-- customers
DROP POLICY IF EXISTS "customers_modify_v8" ON public.customers;
DROP POLICY IF EXISTS "customers_select_v8" ON public.customers;

CREATE POLICY "customers_modify_v11" ON public.customers
  FOR ALL TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  )
  WITH CHECK (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  );

CREATE POLICY "customers_select_v11" ON public.customers
  FOR SELECT TO authenticated
  USING (
    internal.is_super_admin()
    OR org_id::text = internal.get_auth_org_id()
  );

-- check_ins
DROP POLICY IF EXISTS "Manage check-ins" ON public.check_ins;

CREATE POLICY "check_ins_all_v11" ON public.check_ins
  FOR ALL TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND (
        internal.get_auth_role() IN ('admin', 'master')
        OR member_id = (SELECT auth.uid())::text
      )
    )
  )
  WITH CHECK (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND (
        internal.get_auth_role() IN ('admin', 'master')
        OR member_id = (SELECT auth.uid())::text
      )
    )
  );

-- finance
DROP POLICY IF EXISTS "finance_modify_v8" ON public.finance;
DROP POLICY IF EXISTS "finance_select_v8" ON public.finance;

CREATE POLICY "finance_modify_v11" ON public.finance
  FOR ALL TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  )
  WITH CHECK (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  );

CREATE POLICY "finance_select_v11" ON public.finance
  FOR SELECT TO authenticated
  USING (
    internal.is_super_admin()
    OR org_id::text = internal.get_auth_org_id()
  );

-- itineraries
DROP POLICY IF EXISTS "itineraries_modify_v8" ON public.itineraries;
DROP POLICY IF EXISTS "itineraries_select_v8" ON public.itineraries;

CREATE POLICY "itineraries_modify_v11" ON public.itineraries
  FOR ALL TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  )
  WITH CHECK (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  );

CREATE POLICY "itineraries_select_v11" ON public.itineraries
  FOR SELECT TO authenticated
  USING (
    internal.is_super_admin()
    OR org_id::text = internal.get_auth_org_id()
  );

-- stops
DROP POLICY IF EXISTS "stops_modify_v8" ON public.stops;
DROP POLICY IF EXISTS "stops_select_v8" ON public.stops;

CREATE POLICY "stops_modify_v11" ON public.stops
  FOR ALL TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  )
  WITH CHECK (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  );

CREATE POLICY "stops_select_v11" ON public.stops
  FOR SELECT TO authenticated
  USING (
    internal.is_super_admin()
    OR org_id::text = internal.get_auth_org_id()
  );

-- troupes
DROP POLICY IF EXISTS "troupes_modify_v8" ON public.troupes;
DROP POLICY IF EXISTS "troupes_select_v8" ON public.troupes;

CREATE POLICY "troupes_modify_v11" ON public.troupes
  FOR ALL TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  )
  WITH CHECK (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  );

CREATE POLICY "troupes_select_v11" ON public.troupes
  FOR SELECT TO authenticated
  USING (
    internal.is_super_admin()
    OR org_id::text = internal.get_auth_org_id()
  );

-- ──────────────────────────────────────────────────────────────
-- 2. PROTECT ORGANIZATION PLATFORM FIELDS
--    Tenant masters can update org profile/branding fields, but
--    must NOT update platform/billing fields:
--      status, expires_at, subscription_start, subscription_duration,
--      master_email, master_name
--    Only super_admin (or secure RPCs) can touch those.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION internal.protect_org_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'internal'
AS $function$
BEGIN
  -- Super admins can do anything
  IF internal.is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- For all non-super-admin callers (i.e. masters):
  -- Lock platform/billing fields to their old values
  NEW.status := OLD.status;
  NEW.expires_at := OLD.expires_at;
  NEW.subscription_start := OLD.subscription_start;
  NEW.subscription_duration := OLD.subscription_duration;
  NEW.master_email := OLD.master_email;
  NEW.master_name := OLD.master_name;
  RETURN NEW;
END;
$function$;

-- Create the trigger (drop first if somehow exists)
DROP TRIGGER IF EXISTS protect_org_platform_fields ON public.organizations;
CREATE TRIGGER protect_org_platform_fields
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION internal.protect_org_fields();

-- ──────────────────────────────────────────────────────────────
-- 3. FIX super_admin_toggle_org_status
--    Current version silently updates 0 rows if org doesn't exist
--    and still writes an audit log entry. Fix: check existence first.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.super_admin_toggle_org_status(
  target_org_id uuid,
  new_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_id text;
  org_exists boolean;
BEGIN
  IF NOT internal.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only super admins can toggle org status';
  END IF;

  IF new_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;

  -- Verify org exists
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = target_org_id)
  INTO org_exists;

  IF NOT org_exists THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  caller_id := (SELECT auth.uid())::text;

  UPDATE public.organizations SET status = new_status WHERE id = target_org_id;

  INSERT INTO public.audit_logs (actiontype, details, performedby, org_id, timestamp)
  VALUES (
    'SUPER_ADMIN_TOGGLE_ORG_STATUS',
    jsonb_build_object('target_org_id', target_org_id, 'new_status', new_status),
    jsonb_build_object('uid', caller_id, 'role', 'super_admin'),
    NULL,
    now()
  );

  RETURN jsonb_build_object('success', true, 'new_status', new_status);
END;
$function$;

-- ──────────────────────────────────────────────────────────────
-- 4. FIX handle_new_master_user for duplicate emails
--    If the same email exists as a pending member in multiple orgs,
--    the LIMIT 1 is nondeterministic. Fix: prefer the OLDEST pending
--    row (first invited). Also handle master_email duplicate across
--    orgs by preferring oldest active org.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION internal.handle_new_master_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_user_id text;
  target_org_id uuid;
  target_master_name text;
BEGIN
  -- 1. Check if there is already a pre-created member row with this email
  --    (recruited by Admin/Master before signup)
  --    Use ORDER BY createdat ASC to deterministically pick the oldest invite
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE LOWER(email) = LOWER(NEW.email)
    AND (uid IS NULL OR uid = '')
  ORDER BY createdat ASC
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    -- Link the pre-created row to the new auth user
    UPDATE public.users
    SET id = NEW.id::text,
        uid = NEW.id::text,
        status = 'active',
        updatedat = now()
    WHERE id = existing_user_id;
    RETURN NEW;
  END IF;

  -- 2. Check if this email is a master_email for an organization
  --    Use ORDER BY created_at ASC to deterministically pick the oldest org
  SELECT id, master_name INTO target_org_id, target_master_name
  FROM public.organizations
  WHERE LOWER(master_email) = LOWER(NEW.email)
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  IF target_org_id IS NOT NULL THEN
    -- Insert as new Master Admin for that org
    INSERT INTO public.users (id, uid, email, org_id, role, displayname, status)
    VALUES (
      NEW.id::text,
      NEW.id::text,
      NEW.email,
      target_org_id,
      'master',
      COALESCE(target_master_name, 'Master Admin'),
      'active'
    );
    RETURN NEW;
  END IF;

  -- 3. NO match found: do NOT create any user row.
  --    The user will see "No profile found" and be signed out.
  RETURN NEW;
END;
$function$;

-- ──────────────────────────────────────────────────────────────
-- 5. SOURCE-CONTROL the auth.users signup trigger
--    This trigger already exists on remote, but was never in a
--    migration file. Record it here with IF NOT EXISTS safety.
-- ──────────────────────────────────────────────────────────────
-- Drop and recreate to ensure it points to the updated function
DROP TRIGGER IF EXISTS on_auth_user_created_link_tenant ON auth.users;
CREATE TRIGGER on_auth_user_created_link_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION internal.handle_new_master_user();

-- ──────────────────────────────────────────────────────────────
-- 6. DROP old permissive branding storage policies
--    "Admin Delete" allows any authenticated user to delete
--    any object in the branding bucket with no scoping.
--    "Admin Update" and "Admin Upload" are scoped to bucket but
--    use roles={public} which is too wide.
--    If branding bucket is still needed, replace with org-scoped
--    policies. For now, drop the dangerously permissive ones.
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;

-- ──────────────────────────────────────────────────────────────
-- 7. ADD WITH CHECK to org_update policy
--    The current org_update_v10 has USING but no WITH CHECK,
--    which means any column can be written. The trigger now
--    blocks platform fields, but belt-and-suspenders: add WITH CHECK.
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "org_update_v10" ON public.organizations;

CREATE POLICY "org_update_v11" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() = 'master'
    )
  )
  WITH CHECK (
    internal.is_super_admin()
    OR (
      id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() = 'master'
    )
  );
