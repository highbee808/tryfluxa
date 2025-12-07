const SUPABASE_SPOTIFY_LOGIN =
  "https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-login";

export async function GET() {
  try {
    // Get Supabase anon key for authentication (optional but recommended)
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (supabaseAnonKey) {
      headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
      headers["apikey"] = supabaseAnonKey;
    }

    const res = await fetch(SUPABASE_SPOTIFY_LOGIN, {
      method: "GET",
      headers,
    });

    // If Supabase fails, forward JSON error
    if (!res.ok) {
      const errorText = await res.text();
      return new Response(
        JSON.stringify({ error: `Supabase error: ${errorText}` }),
        {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Ensure valid JSON is returned
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: (err as Error).message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

