// Re-export the generated Supabase client to ensure a single source of truth
// and avoid using VITE_* env variables which are not supported in this environment.
import { supabase } from "@/integrations/supabase/client";

export { supabase };