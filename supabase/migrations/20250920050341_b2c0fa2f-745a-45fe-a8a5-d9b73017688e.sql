-- Fix overly permissive update policy on gd_ai_messages
DROP POLICY "Allow updates for embeddings and content" ON public.gd_ai_messages;

CREATE POLICY "Allow session-scoped updates" ON public.gd_ai_messages
FOR UPDATE USING (
  session_id = current_setting('request.session_id', true)::text
) WITH CHECK (
  session_id IS NOT NULL 
  AND role IN ('user', 'assistant', 'system')
  AND content IS NOT NULL
  AND content <> ''
  AND session_id = current_setting('request.session_id', true)::text
);

-- Fix unrestricted session deletion policy
DROP POLICY "Allow session deletion" ON public.gd_ai_sessions;

CREATE POLICY "Allow session-scoped deletion" ON public.gd_ai_sessions
FOR DELETE USING (
  session_id = current_setting('request.session_id', true)::text
);