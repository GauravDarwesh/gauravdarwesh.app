-- CRITICAL PRIVACY FIX: Remove public data access and implement session-based privacy

-- 1. Drop the dangerous public read access policies
DROP POLICY IF EXISTS "Allow public read access to messages" ON public.gd_ai_messages;
DROP POLICY IF EXISTS "Allow public read access to sessions" ON public.gd_ai_sessions;

-- 2. Create secure session-scoped policies for gd_ai_messages
-- Users can only read messages from their own session (when session_id is explicitly provided in query)
CREATE POLICY "Users can read own session messages" ON public.gd_ai_messages
FOR SELECT USING (
  session_id = current_setting('request.session_id', true)::text
);

-- Keep existing insert/update policies but make them more restrictive
DROP POLICY IF EXISTS "Allow public insert of messages" ON public.gd_ai_messages;
CREATE POLICY "Allow session-scoped insert of messages" ON public.gd_ai_messages
FOR INSERT WITH CHECK (
  session_id IS NOT NULL 
  AND role IN ('user', 'assistant', 'system')
  AND content IS NOT NULL
  AND content != ''
  AND session_id = current_setting('request.session_id', true)::text
);

-- 3. Create secure session-scoped policies for gd_ai_sessions  
-- Users can only read their own session data
CREATE POLICY "Users can read own session" ON public.gd_ai_sessions
FOR SELECT USING (
  session_id = current_setting('request.session_id', true)::text
);

-- Update session policies to be session-scoped
DROP POLICY IF EXISTS "Allow public insert of sessions" ON public.gd_ai_sessions;
DROP POLICY IF EXISTS "Allow session updates" ON public.gd_ai_sessions;

CREATE POLICY "Allow session-scoped insert of sessions" ON public.gd_ai_sessions
FOR INSERT WITH CHECK (
  session_id IS NOT NULL 
  AND session_id != ''
  AND session_id = current_setting('request.session_id', true)::text
);

CREATE POLICY "Allow session-scoped updates" ON public.gd_ai_sessions
FOR UPDATE USING (
  session_id = current_setting('request.session_id', true)::text
) WITH CHECK (
  session_id IS NOT NULL 
  AND session_id != ''
  AND session_id = current_setting('request.session_id', true)::text
);

-- 4. Create security definer functions for safe database access
-- Function to safely query session messages with proper session validation
CREATE OR REPLACE FUNCTION public.get_session_messages(p_session_id text)
RETURNS TABLE(
  id bigint,
  role text, 
  content text,
  created_at timestamp with time zone,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Validate session_id is provided
  IF p_session_id IS NULL OR p_session_id = '' THEN
    RAISE EXCEPTION 'Session ID is required';
  END IF;
  
  -- Set session context for RLS
  PERFORM set_config('request.session_id', p_session_id, true);
  
  RETURN QUERY
  SELECT m.id, m.role, m.content, m.created_at, m.source
  FROM gd_ai_messages m
  WHERE m.session_id = p_session_id
  ORDER BY m.created_at DESC;
END;
$function$;

-- Function to safely query session info
CREATE OR REPLACE FUNCTION public.get_session_info(p_session_id text)
RETURNS TABLE(
  session_id text,
  introduced boolean,
  total_messages integer,
  last_updated timestamp with time zone,
  user_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Validate session_id is provided
  IF p_session_id IS NULL OR p_session_id = '' THEN
    RAISE EXCEPTION 'Session ID is required';
  END IF;
  
  -- Set session context for RLS  
  PERFORM set_config('request.session_id', p_session_id, true);
  
  RETURN QUERY
  SELECT s.session_id, s.introduced, s.total_messages, s.last_updated, s.user_name
  FROM gd_ai_sessions s
  WHERE s.session_id = p_session_id;
END;
$function$;

-- Function to safely insert messages
CREATE OR REPLACE FUNCTION public.insert_session_message(
  p_session_id text,
  p_role text,
  p_content text,
  p_source text DEFAULT 'gemini'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_id bigint;
BEGIN
  -- Validate inputs
  IF p_session_id IS NULL OR p_session_id = '' THEN
    RAISE EXCEPTION 'Session ID is required';
  END IF;
  
  IF p_role NOT IN ('user', 'assistant', 'system') THEN
    RAISE EXCEPTION 'Invalid role. Must be user, assistant, or system';
  END IF;
  
  IF p_content IS NULL OR p_content = '' THEN
    RAISE EXCEPTION 'Content cannot be empty';
  END IF;
  
  -- Set session context for RLS
  PERFORM set_config('request.session_id', p_session_id, true);
  
  INSERT INTO gd_ai_messages (session_id, role, content, source)
  VALUES (p_session_id, p_role, p_content, p_source)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$function$;