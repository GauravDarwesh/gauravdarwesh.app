-- 1) Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated.
-- These are only called by edge functions using the service role.
REVOKE EXECUTE ON FUNCTION public.claim_gdx_chat_turn(text, text, boolean) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_gdx_chat_turn(text, text, boolean, text, text, boolean) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_gdx_notification_sent(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_user_messages(text, vector, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.insert_session_message(text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_session_info(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_session_messages(text) FROM anon, authenticated;

-- 2) Fix session_id spoofing: once a session is claimed by an authenticated user
-- (user_id set), only that user may read/write it. Anonymous sessions (user_id IS NULL)
-- keep working via the session_id setting.
DROP POLICY IF EXISTS "Users can read own session" ON public.gd_ai_sessions;
CREATE POLICY "Users can read own session" ON public.gd_ai_sessions
  FOR SELECT TO public
  USING (
    session_id = current_setting('request.session_id'::text, true)
    AND (user_id IS NULL OR auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Allow session-scoped updates" ON public.gd_ai_sessions;
CREATE POLICY "Allow session-scoped updates" ON public.gd_ai_sessions
  FOR UPDATE TO public
  USING (
    session_id = current_setting('request.session_id'::text, true)
    AND (user_id IS NULL OR auth.uid() = user_id)
  )
  WITH CHECK (
    session_id IS NOT NULL AND session_id <> ''
    AND session_id = current_setting('request.session_id'::text, true)
    AND (user_id IS NULL OR auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Allow session-scoped deletion" ON public.gd_ai_sessions;
CREATE POLICY "Allow session-scoped deletion" ON public.gd_ai_sessions
  FOR DELETE TO public
  USING (
    session_id = current_setting('request.session_id'::text, true)
    AND (user_id IS NULL OR auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Users can read own session messages" ON public.gd_ai_messages;
CREATE POLICY "Users can read own session messages" ON public.gd_ai_messages
  FOR SELECT TO public
  USING (
    session_id = current_setting('request.session_id'::text, true)
    AND NOT EXISTS (
      SELECT 1 FROM public.gd_ai_sessions s
      WHERE s.session_id = gd_ai_messages.session_id
        AND s.user_id IS NOT NULL
        AND s.user_id <> auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow session-scoped updates" ON public.gd_ai_messages;
CREATE POLICY "Allow session-scoped updates" ON public.gd_ai_messages
  FOR UPDATE TO public
  USING (
    session_id = current_setting('request.session_id'::text, true)
    AND NOT EXISTS (
      SELECT 1 FROM public.gd_ai_sessions s
      WHERE s.session_id = gd_ai_messages.session_id
        AND s.user_id IS NOT NULL
        AND s.user_id <> auth.uid()
    )
  )
  WITH CHECK (
    session_id IS NOT NULL
    AND role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])
    AND content IS NOT NULL AND content <> ''
    AND session_id = current_setting('request.session_id'::text, true)
  );

DROP POLICY IF EXISTS "Allow session-scoped insert of messages" ON public.gd_ai_messages;
CREATE POLICY "Allow session-scoped insert of messages" ON public.gd_ai_messages
  FOR INSERT TO public
  WITH CHECK (
    session_id IS NOT NULL
    AND role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])
    AND content IS NOT NULL AND content <> ''
    AND session_id = current_setting('request.session_id'::text, true)
    AND NOT EXISTS (
      SELECT 1 FROM public.gd_ai_sessions s
      WHERE s.session_id = gd_ai_messages.session_id
        AND s.user_id IS NOT NULL
        AND s.user_id <> auth.uid()
    )
  );

-- 3) gd_leads and gd_notification_outbox are written only by SECURITY DEFINER
-- functions and read only by the service role (edge functions). Make the
-- deny-by-default posture explicit with deny-all policies for API roles.
CREATE POLICY "No direct API access to leads" ON public.gd_leads
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No direct API access to notification outbox" ON public.gd_notification_outbox
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 4) Storage: allow public read of the public website asset buckets,
-- explicitly block anonymous/authenticated writes and deletes.
CREATE POLICY "Public read of website asset buckets" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id IN (
      'Europe 2016', 'Japan 2025', 'JPN-2024', 'bcg', 'videos',
      'Gaurav Darwesh Info -  AI', 'Personal Website Background Images'
    )
  );

CREATE POLICY "Block public uploads" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "Block public modifications" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Block public deletions" ON storage.objects
  FOR DELETE TO anon, authenticated USING (false);