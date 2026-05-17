-- ============================================================
-- MIGRATION: enforce_signup_whitelist
-- Modify handle_new_master_user so that if an email is NOT 
-- pre-registered in public.users or as a master_email in 
-- public.organizations, the signup is rejected with an exception.
-- ============================================================

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

  -- 3. NO match found: abort signup
  RAISE EXCEPTION 'Unauthorized: Your email address is not registered. Please contact your administrator to be recruited first.';
END;
$function$;
