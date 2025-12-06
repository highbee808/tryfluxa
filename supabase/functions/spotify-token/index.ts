import { encode } from "jsr:@std/encoding/base64";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing code" }), { status: 400 });
    }

    const clientId = Deno.env.get("VITE_SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("VITE_SPOTIFY_CLIENT_SECRET");
    const redirectUri = Deno.env.get("VITE_SPOTIFY_REDIRECT_URI");

    const auth = encode(`${clientId}:${clientSecret}`);

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`
    });

    const data = await tokenRes.json();

    if (!data.access_token) {
      return new Response(
        JSON.stringify({ error: "Token missing", raw: data }),
        { status: 400 }
      );
    }

    return new Response(JSON.stringify(data), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
