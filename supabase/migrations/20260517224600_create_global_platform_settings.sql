-- ============================================================
-- MIGRATION: create_global_platform_settings
-- Creates a singleton table for platform-wide Super Admin configurations.
-- Currently supports global 'maintenance_mode'.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.global_platform_settings (
  id text PRIMARY KEY DEFAULT 'system',
  maintenance_mode boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Ensure only one row can ever exist (id must be 'system')
ALTER TABLE public.global_platform_settings 
  ADD CONSTRAINT ensure_singleton CHECK (id = 'system');

-- Insert the default row if it doesn't exist
INSERT INTO public.global_platform_settings (id, maintenance_mode)
VALUES ('system', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS
ALTER TABLE public.global_platform_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read the platform settings (needed to check if maintenance is active on login screen)
CREATE POLICY "Anyone can read global platform settings"
  ON public.global_platform_settings
  FOR SELECT
  USING (true);

-- Only Super Admins can update the platform settings
CREATE POLICY "Super admins can update global platform settings"
  ON public.global_platform_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text
      AND users.is_super_admin = true
    )
  );
