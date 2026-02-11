/**
 * Spotify OAuth Refresh - Refresh expired access tokens
 * Reads refresh_token from DB (never from request body).
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
    // --- Authenticate user from JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired JWT" }),
        { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    // --- Read refresh token from DB ---
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: account, error: dbError } = await supabaseAdmin
      .from("spotify_accounts")
      .select("refresh_token")
      .eq("user_id", user.id)
      .single();

    if (dbError || !account?.refresh_token) {
      return new Response(
        JSON.stringify({ error: "No Spotify account linked. Please re-authorize." }),
        { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    // --- Exchange refresh token for new access token ---
    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[spotify-oauth-refresh] Spotify refresh failed:", errorText);

      // If refresh token is invalid/revoked, delete DB row to force re-auth
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        await supabaseAdmin
          .from("spotify_accounts")
          .delete()
          .eq("user_id", user.id);

        return new Response(
          JSON.stringify({ error: "Spotify refresh token revoked. Please re-authorize." }),
          { status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to refresh token" }),
        { status: tokenResponse.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();

    // --- Update DB with new tokens ---
    const expiresAt = new Date(
      Date.now() + (tokenData.expires_in ?? 3600) * 1000
    ).toISOString();

    await supabaseAdmin
      .from("spotify_accounts")
      .update({
        access_token: tokenData.access_token,
        expires_at: expiresAt,
        // Spotify may rotate refresh tokens
        ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in || 3600,
      }),
      { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[spotify-oauth-refresh] Error:", error);
    const origin = req.headers.get("origin") || "*";
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to refresh token" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
