-- Enable RLS on public.gd_ai_sessions to satisfy security linter 0013
ALTER TABLE public.gd_ai_sessions ENABLE ROW LEVEL SECURITY;

-- Note: With RLS enabled and no policies defined, no access is permitted by default
-- (service role continues to bypass RLS). This is the safest minimal change and
-- will not break the current app since the table is not queried by the UI.
