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
        })
      );
    }

    const client_id = Deno.env.get("SPOTIFY_CLIENT_ID");
    const client_secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      code_verifier,
      client_id,
      client_secret,
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const tokenJson = await tokenRes.json();

    return cors(
      req,
      new Response(JSON.stringify(tokenJson), {
        headers: { "Content-Type": "application/json" },
      })
    );
  } catch (err) {
    return cors(
      req,
      new Response(
        JSON.stringify({ error: "Token exchange failed", details: (err as Error).message }),
        { status: 500 }
      )
    );
  }
});
