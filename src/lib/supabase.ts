/**
 * Canonical Supabase client entry point.
 *
 * All service files under `src/services/` import from here. UI code
 * (routes/components) should NEVER import supabase directly — instead call
 * the exported functions from `src/services/*`.
 */
export { supabase, supabaseSignup } from "@/db/supabase";
