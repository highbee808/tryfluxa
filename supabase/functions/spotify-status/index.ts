/**
 * Spotify Status - Returns connection status for the authenticated user.
 * Never returns tokens.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin") || "*";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ connected: false }),
        { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use the user's JWT so RLS applies — no service role needed
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ connected: false }),
        { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const { data: account } = await supabase
      .from("spotify_accounts")
      .select("spotify_user_id, display_name, expires_at")
      .eq("user_id", user.id)
      .single();

    if (!account) {
      return new Response(
        JSON.stringify({ connected: false }),
        { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const tokenExpired = account.expires_at
      ? new Date(account.expires_at) < new Date()
      : false;

    return new Response(
      JSON.stringify({
        connected: true,
        spotify_user_id: account.spotify_user_id,
        display_name: account.display_name,
        token_expired: tokenExpired,
      }),
      { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[spotify-status] Error:", error);
    return new Response(
      JSON.stringify({ connected: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders(req.headers.get("origin") || "*"), "Content-Type": "application/json" } }
    );
  }
});
