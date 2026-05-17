-- ============================================================
-- MIGRATION: security_hardening_auth_rls_v10
-- Comprehensive auth, onboarding, and RLS hardening
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. HARDEN protect_role_fields trigger: also protect status
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION internal.protect_role_fields()
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

  -- Masters of the SAME org can change role and status, but NOT is_super_admin or org_id
  IF internal.get_auth_role() = 'master' AND OLD.org_id::text = internal.get_auth_org_id() THEN
    NEW.is_super_admin := OLD.is_super_admin;
    NEW.org_id := OLD.org_id;
    RETURN NEW;
  END IF;

  -- Everyone else: lock ALL privileged fields
  NEW.role := OLD.role;
  NEW.is_super_admin := OLD.is_super_admin;
  NEW.org_id := OLD.org_id;
  NEW.status := OLD.status;
  RETURN NEW;
END;
$function$;

-- ──────────────────────────────────────────────────────────────
-- 2. Replace users UPDATE policy: regular users can only update
--    their own appearance/display fields (not role/status/org)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_update_v8" ON public.users;

-- Masters and admins of same org can update members
CREATE POLICY "users_update_admin_v10" ON public.users
  FOR UPDATE TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      internal.get_auth_role() IN ('master', 'admin')
      AND org_id::text = internal.get_auth_org_id()
    )
  );

-- Users can update ONLY their own row (trigger blocks privileged fields)
CREATE POLICY "users_update_self_v10" ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())::text
  );

-- ──────────────────────────────────────────────────────────────
-- 3. Harden users INSERT: prevent self-insertion with elevated role
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_insert_v8" ON public.users;

CREATE POLICY "users_insert_v10" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    internal.is_super_admin()
    OR (
      internal.get_auth_role() IN ('master', 'admin')
      AND org_id::text = internal.get_auth_org_id()
      -- Cannot insert users with super_admin flag
      AND COALESCE(is_super_admin, false) = false
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 4. Harden handle_new_master_user trigger to:
--    - Only create master row if org.master_email matches
--    - Only link existing row if email matches a pending member
--    - Never allow random signups to get elevated roles
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
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE LOWER(email) = LOWER(NEW.email)
    AND (uid IS NULL OR uid = '')
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
  SELECT id, master_name INTO target_org_id, target_master_name
  FROM public.organizations
  WHERE LOWER(master_email) = LOWER(NEW.email)
    AND status = 'active'
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
-- 5. Secure RPC: super_admin_delete_org
--    Moves destructive tenant deletion behind a server-side
--    function with guaranteed audit logging.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.super_admin_delete_org(
  target_org_id uuid,
  confirmed_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_record record;
  caller_id text;
BEGIN
  -- Verify caller is super admin
  IF NOT internal.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only super admins can delete organizations';
  END IF;

  -- Verify org exists and name matches
  SELECT id, name_en INTO org_record
  FROM public.organizations
  WHERE id = target_org_id;

  IF org_record IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  IF org_record.name_en != confirmed_name THEN
    RAISE EXCEPTION 'Organization name does not match confirmation';
  END IF;

  caller_id := (SELECT auth.uid())::text;

  -- Write audit log BEFORE deletion (cascade will remove child data)
  INSERT INTO public.audit_logs (actiontype, details, performedby, org_id, timestamp)
  VALUES (
    'SUPER_ADMIN_DELETE_ORG',
    jsonb_build_object(
      'org_id', target_org_id,
      'org_name', org_record.name_en,
      'action', 'permanent_delete'
    ),
    jsonb_build_object('uid', caller_id, 'role', 'super_admin'),
    NULL,
    now()
  );

  -- Perform deletion (cascades will handle child tables)
  DELETE FROM public.organizations WHERE id = target_org_id;

  RETURN jsonb_build_object('success', true, 'deleted_org', org_record.name_en);
END;
$function$;

-- Grant execute to authenticated users (RPC will verify super_admin internally)
GRANT EXECUTE ON FUNCTION public.super_admin_delete_org(uuid, text) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 6. Secure RPC: super_admin_toggle_org_status
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
BEGIN
  IF NOT internal.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only super admins can toggle org status';
  END IF;

  IF new_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status value';
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

GRANT EXECUTE ON FUNCTION public.super_admin_toggle_org_status(uuid, text) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 7. Harden organizations UPDATE policy:
--    Only masters of same org or super admins can update
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "org_update_own" ON public.organizations;

CREATE POLICY "org_update_v10" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() = 'master'
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 8. Harden storage policies for org-assets:
--    Only admin/master can write, all org members can read
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Org Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Org Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "org_assets_select_v10" ON storage.objects;

CREATE POLICY "org_assets_select_v10" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (
      internal.is_super_admin()
      OR (storage.foldername(name))[1] = ('org_' || internal.get_auth_org_id())
    )
  );

CREATE POLICY "org_assets_insert_v10" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org-assets'
    AND (
      internal.is_super_admin()
      OR (
        internal.get_auth_role() IN ('admin', 'master')
        AND (storage.foldername(name))[1] = ('org_' || internal.get_auth_org_id())
      )
    )
  );

CREATE POLICY "org_assets_update_v10" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (
      internal.is_super_admin()
      OR (
        internal.get_auth_role() IN ('admin', 'master')
        AND (storage.foldername(name))[1] = ('org_' || internal.get_auth_org_id())
      )
    )
  );

CREATE POLICY "org_assets_delete_v10" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (
      internal.is_super_admin()
      OR (
        internal.get_auth_role() IN ('admin', 'master')
        AND (storage.foldername(name))[1] = ('org_' || internal.get_auth_org_id())
      )
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 9. Harden audit_logs: INSERT-only for non-super-admins
--    (prevent tampering with existing audit records)
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "audit_logs_org_v7" ON public.audit_logs;

-- Anyone in the org can INSERT audit logs
CREATE POLICY "audit_logs_insert_v10" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    internal.is_super_admin()
    OR org_id::text = internal.get_auth_org_id()
  );

-- Only super admins and admin/master can READ audit logs
CREATE POLICY "audit_logs_select_v10" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master')
    )
  );

-- Nobody can UPDATE or DELETE audit logs (not even super admins from client)
-- Super admin can only delete via SQL editor / service role

-- ──────────────────────────────────────────────────────────────
-- 10. Settings: restrict UPDATE/INSERT/DELETE to admin/master of same org
--     (settings currently has no org_id, so keep existing logic)
-- ──────────────────────────────────────────────────────────────
-- Settings policies are acceptable as-is (admin/master only for writes, authenticated for reads)

-- ──────────────────────────────────────────────────────────────
-- 11. Add inventory SELECT for all org members (read-only access)
-- ──────────────────────────────────────────────────────────────
-- Currently inventory only allows admin/master/logistics (ALL), add read for members
DROP POLICY IF EXISTS "inventory_org_v8" ON public.inventory;

CREATE POLICY "inventory_select_v10" ON public.inventory
  FOR SELECT TO authenticated
  USING (
    internal.is_super_admin()
    OR org_id::text = internal.get_auth_org_id()
  );

CREATE POLICY "inventory_modify_v10" ON public.inventory
  FOR ALL TO authenticated
  USING (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master', 'logistics')
    )
  )
  WITH CHECK (
    internal.is_super_admin()
    OR (
      org_id::text = internal.get_auth_org_id()
      AND internal.get_auth_role() IN ('admin', 'master', 'logistics')
    )
  );
