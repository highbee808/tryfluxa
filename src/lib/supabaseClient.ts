import { createClient } from "@supabase/supabase-js";

// Use frontend build-time vars (these ARE allowed on frontend)
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("❌ Frontend missing VITE_SUPABASE_* vars", { url: !!url, anon: !!anon });
}

export const supabase = createClient(url!, anon!, {
  auth: { persistSession: false }
});
