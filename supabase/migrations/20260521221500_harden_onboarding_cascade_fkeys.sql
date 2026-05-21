-- ============================================================
-- MIGRATION: harden_onboarding_cascade_fkeys
-- Resolves onboarding/signup failures when referencing rows exist:
--   1. Drop and recreate check_ins, stops, and billing_docs FKs with ON UPDATE CASCADE
--   2. Update handle_new_master_user trigger to cascade user ID in JSONB columns
-- ============================================================

-- 1. Alter Foreign Key Constraints to ON UPDATE CASCADE
ALTER TABLE public.check_ins 
  DROP CONSTRAINT IF EXISTS check_ins_member_id_fkey;

ALTER TABLE public.check_ins 
  ADD CONSTRAINT check_ins_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES public.users(id) 
  ON UPDATE CASCADE 
  ON DELETE SET NULL;

ALTER TABLE public.stops 
  DROP CONSTRAINT IF EXISTS stops_createdby_fkey;

ALTER TABLE public.stops 
  ADD CONSTRAINT stops_createdby_fkey 
  FOREIGN KEY (createdby) REFERENCES public.users(id) 
  ON UPDATE CASCADE 
  ON DELETE SET NULL;

ALTER TABLE public.billing_docs 
  DROP CONSTRAINT IF EXISTS billing_docs_generatedby_fkey;

ALTER TABLE public.billing_docs 
  ADD CONSTRAINT billing_docs_generatedby_fkey 
  FOREIGN KEY (generatedby) REFERENCES public.users(id) 
  ON UPDATE CASCADE 
  ON DELETE SET NULL;

-- 2. Update handle_new_master_user Trigger Function to Cascade JSONB updates
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
    -- Link the pre-created row to the new auth user (foreign keys will CASCADE update)
    UPDATE public.users
    SET id = NEW.id::text,
        uid = NEW.id::text,
        status = 'active',
        updatedat = now()
    WHERE id = existing_user_id;

    -- Cascade updates in troupes.memberids JSONB array
    UPDATE public.troupes
    SET memberids = (
      SELECT COALESCE(jsonb_agg(
        CASE 
          WHEN el = to_jsonb(existing_user_id) THEN to_jsonb(NEW.id::text)
          ELSE el
        END
      ), '[]'::jsonb)
      FROM jsonb_array_elements(memberids) AS el
    )
    WHERE memberids ? existing_user_id;

    -- Cascade updates in itineraries.attendance JSONB array
    UPDATE public.itineraries
    SET attendance = (
      SELECT COALESCE(jsonb_agg(
        CASE 
          WHEN el = to_jsonb(existing_user_id) THEN to_jsonb(NEW.id::text)
          ELSE el
        END
      ), '[]'::jsonb)
      FROM jsonb_array_elements(attendance) AS el
    )
    WHERE attendance ? existing_user_id;

    -- Cascade updates in itineraries.attendancedetails JSONB object (key replacement)
    UPDATE public.itineraries
    SET attendancedetails = (attendancedetails - existing_user_id) || jsonb_build_object(NEW.id::text, attendancedetails -> existing_user_id)
    WHERE attendancedetails ? existing_user_id;

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
