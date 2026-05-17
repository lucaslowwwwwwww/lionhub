-- Revoke anon access to super admin RPCs
REVOKE EXECUTE ON FUNCTION public.super_admin_delete_org(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.super_admin_toggle_org_status(uuid, text) FROM anon;

-- Also revoke from public role (default grant) and re-grant only to authenticated
REVOKE ALL ON FUNCTION public.super_admin_delete_org(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.super_admin_toggle_org_status(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.super_admin_delete_org(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_toggle_org_status(uuid, text) TO authenticated;
