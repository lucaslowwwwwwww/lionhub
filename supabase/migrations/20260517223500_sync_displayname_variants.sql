-- ============================================================
-- MIGRATION: sync_displayname_variants
-- The Supabase Auth Dashboard often prioritizes different keys 
-- (like 'displayName' or 'name') over 'display_name'.
-- We need to ensure ALL common name keys are updated to prevent conflicts.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_user_displayname_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.displayname IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND OLD.displayname IS DISTINCT FROM NEW.displayname) THEN
    
    UPDATE auth.users
    SET raw_user_meta_data = 
      coalesce(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'display_name', NEW.displayname, 
        'displayName', NEW.displayname, 
        'full_name', NEW.displayname,
        'name', NEW.displayname
      )
    WHERE id = NEW.id::uuid;
  END IF;
  RETURN NEW;
END;
$$;
