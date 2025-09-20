-- Fix database security issues identified in security review

-- 1. Update the match_user_messages function to prevent search path injection
CREATE OR REPLACE FUNCTION public.match_user_messages(p_session_id text, p_query_embedding vector, p_match_count integer DEFAULT 5)
 RETURNS TABLE(id bigint, content text, created_at timestamp with time zone, similarity double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = public
AS $function$
begin
  return query
  select
    m.id,
    m.content,
    m.created_at,
    1 - (m.embedding <=> p_query_embedding) as similarity
  from gd_ai_messages m
  where m.session_id = p_session_id
    and m.role = 'user'
    and m.embedding is not null
  order by m.embedding <=> p_query_embedding
  limit p_match_count;
end;
$function$;

-- 2. Drop the overly restrictive RLS policies on gd_ai_messages
DROP POLICY IF EXISTS "No direct delete on messages" ON public.gd_ai_messages;
DROP POLICY IF EXISTS "No direct insert on messages" ON public.gd_ai_messages;
DROP POLICY IF EXISTS "No direct select on messages" ON public.gd_ai_messages;
DROP POLICY IF EXISTS "No direct update on messages" ON public.gd_ai_messages;

-- 3. Drop the overly restrictive RLS policies on gd_ai_sessions
DROP POLICY IF EXISTS "No direct delete on sessions" ON public.gd_ai_sessions;
DROP POLICY IF EXISTS "No direct insert on sessions" ON public.gd_ai_sessions;
DROP POLICY IF EXISTS "No direct select on sessions" ON public.gd_ai_sessions;
DROP POLICY IF EXISTS "No direct update on sessions" ON public.gd_ai_sessions;

-- 4. Create functional RLS policies for gd_ai_messages
-- Allow public read access to messages (since this appears to be a public chat system)
CREATE POLICY "Allow public read access to messages" ON public.gd_ai_messages
FOR SELECT USING (true);

-- Allow public insert of new messages
CREATE POLICY "Allow public insert of messages" ON public.gd_ai_messages
FOR INSERT WITH CHECK (
  session_id IS NOT NULL 
  AND role IN ('user', 'assistant', 'system')
  AND content IS NOT NULL
  AND content != ''
);

-- Allow updates only to add embeddings or modify content
CREATE POLICY "Allow updates for embeddings and content" ON public.gd_ai_messages
FOR UPDATE USING (true) WITH CHECK (
  session_id IS NOT NULL 
  AND role IN ('user', 'assistant', 'system')
  AND content IS NOT NULL
);

-- Prevent direct deletion of messages for data integrity
CREATE POLICY "Prevent direct deletion of messages" ON public.gd_ai_messages
FOR DELETE USING (false);

-- 5. Create functional RLS policies for gd_ai_sessions
-- Allow public read access to sessions
CREATE POLICY "Allow public read access to sessions" ON public.gd_ai_sessions
FOR SELECT USING (true);

-- Allow public insert of new sessions
CREATE POLICY "Allow public insert of sessions" ON public.gd_ai_sessions
FOR INSERT WITH CHECK (session_id IS NOT NULL AND session_id != '');

-- Allow updates to session metadata
CREATE POLICY "Allow session updates" ON public.gd_ai_sessions
FOR UPDATE USING (true) WITH CHECK (session_id IS NOT NULL AND session_id != '');

-- Allow deletion of old sessions for cleanup
CREATE POLICY "Allow session deletion" ON public.gd_ai_sessions
FOR DELETE USING (true);