-- ============================================================
-- Migration: Create calendar_events table + RLS policies
-- ============================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  color       TEXT DEFAULT 'blue',
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 3. Index for fast org + time range lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_time
  ON public.calendar_events (org_id, start_time);

-- 4. RLS Policies

-- SELECT: All authenticated users can view events for their org
CREATE POLICY "calendar_events_select"
  ON public.calendar_events
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT u.org_id FROM public.users u
      WHERE u.uid = (SELECT auth.uid()::text)
    )
  );

-- INSERT: Only admin and master roles
CREATE POLICY "calendar_events_insert"
  ON public.calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT u.org_id FROM public.users u
      WHERE u.uid = (SELECT auth.uid()::text)
        AND u.role IN ('admin', 'master')
    )
  );

-- UPDATE: Only admin and master roles
CREATE POLICY "calendar_events_update"
  ON public.calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT u.org_id FROM public.users u
      WHERE u.uid = (SELECT auth.uid()::text)
        AND u.role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT u.org_id FROM public.users u
      WHERE u.uid = (SELECT auth.uid()::text)
        AND u.role IN ('admin', 'master')
    )
  );

-- DELETE: Only admin and master roles
CREATE POLICY "calendar_events_delete"
  ON public.calendar_events
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT u.org_id FROM public.users u
      WHERE u.uid = (SELECT auth.uid()::text)
        AND u.role IN ('admin', 'master')
    )
  );

-- 5. Enable realtime for calendar_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
