-- ============================================================
-- MIGRATION: sync_displayname_to_auth
-- Synchronize updates to public.users.displayname back to 
-- auth.users.raw_user_meta_data.display_name and full_name 
-- automatically via database trigger.
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
      jsonb_build_object('display_name', NEW.displayname, 'full_name', NEW.displayname)
    WHERE id = NEW.id::uuid;
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_user_displayname ON public.users;
CREATE TRIGGER trigger_sync_user_displayname
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_displayname_to_auth();
