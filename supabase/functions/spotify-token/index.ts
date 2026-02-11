import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors } from "../_shared/cors.ts";

serve(async (req) => {
  // --- Handle preflight ---
  if (req.method === "OPTIONS") {
    return cors(req, new Response("ok", { status: 200 }));
  }

  try {
    const { code, code_verifier, redirect_uri } = await req.json();

    if (!code || !code_verifier) {
      return cors(
        req,
        new Response(JSON.stringify({ error: "Missing code or verifier" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Resolve redirect_uri: prefer body param, fallback to env
    const resolvedRedirectUri =
      redirect_uri || Deno.env.get("SPOTIFY_REDIRECT_URI");

    if (!resolvedRedirectUri) {
      return cors(
        req,
        new Response(
          JSON.stringify({ error: "Missing redirect_uri and no SPOTIFY_REDIRECT_URI env" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      );
    }

    const client_id = Deno.env.get("SPOTIFY_CLIENT_ID")!;
    const client_secret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

    // --- Exchange authorization code for tokens ---
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: resolvedRedirectUri,
      code_verifier,
      client_id,
      client_secret,
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("[spotify-token] Spotify token exchange failed:", tokenJson);
      return cors(
        req,
        new Response(
          JSON.stringify({
            error: "Token exchange failed",
            details: tokenJson.error_description || tokenJson.error,
          }),
          { status: tokenRes.status, headers: { "Content-Type": "application/json" } }
        )
      );
    }

    // --- Extract user from JWT Authorization header ---
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
      } = await supabaseUser.auth.getUser();
      userId = user?.id ?? null;
    }

    // --- Persist tokens to DB if we have a user ---
    if (userId) {
      try {
        // Fetch Spotify profile
        const profileRes = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        const profile = profileRes.ok ? await profileRes.json() : null;

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        const expiresAt = new Date(
          Date.now() + (tokenJson.expires_in ?? 3600) * 1000
        ).toISOString();

        await supabaseAdmin.from("spotify_accounts").upsert(
          {
            user_id: userId,
            spotify_user_id: profile?.id ?? null,
            display_name: profile?.display_name ?? null,
            access_token: tokenJson.access_token,
            refresh_token: tokenJson.refresh_token,
            expires_at: expiresAt,
            scopes: tokenJson.scope ?? null,
          },
          { onConflict: "user_id" }
        );
      } catch (dbErr) {
        // Log but don't fail the response — tokens still returned to frontend
        console.error("[spotify-token] DB persist failed:", dbErr);
      }
    }

    // --- Return tokens to frontend ---
    return cors(
      req,
      new Response(JSON.stringify(tokenJson), {
        headers: { "Content-Type": "application/json" },
      })
    );
  } catch (err) {
    console.error("[spotify-token] Unexpected error:", err);
    return cors(
      req,
      new Response(
        JSON.stringify({
          error: "Token exchange failed",
          details: (err as Error).message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    );
  }
});
