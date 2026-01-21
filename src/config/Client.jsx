import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: true, // ✅ REQUIRED for reset-password & email confirm
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;
