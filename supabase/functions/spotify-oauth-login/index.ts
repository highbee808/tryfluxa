import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_REDIRECT_URI,
} from "../_shared/env.ts";

const SCOPES =
  "user-read-email user-read-private user-read-playback-state user-modify-playback-state";

serve(async () => {
  const state = crypto.randomUUID();

  const loginUrl = new URL("https://accounts.spotify.com/authorize");
  loginUrl.searchParams.set("client_id", SPOTIFY_CLIENT_ID!);
  loginUrl.searchParams.set("response_type", "code");
  loginUrl.searchParams.set("redirect_uri", SPOTIFY_REDIRECT_URI!);
  loginUrl.searchParams.set("scope", SCOPES);
  loginUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 307,
    headers: {
      Location: loginUrl.toString(),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
});
