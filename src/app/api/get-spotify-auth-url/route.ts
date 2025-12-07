// Vercel serverless function - works with both Next.js and Vite projects
export async function GET() {
  try {
    // Support both Next.js and Vite env var naming
    const supabaseUrl = 
      process.env.NEXT_PUBLIC_SUPABASE_URL || 
      process.env.VITE_SUPABASE_URL ||
      "https://vzjyclgrqoyxbbzplkgw.supabase.co";
    
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    
    // Add auth headers if available
    const supabaseAnonKey = 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (supabaseAnonKey) {
      headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
      headers["apikey"] = supabaseAnonKey;
    }

    const res = await fetch(
      `${supabaseUrl}/functions/v1/spotify-oauth-login`,
      { method: "GET", headers }
    );

    const text = await res.text();

    // If backend returned HTML, treat as error
    if (text.startsWith("<")) {
      return new Response(
        JSON.stringify({ error: "Invalid backend response (HTML returned)" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = JSON.parse(text);
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to load auth URL", details: String(err) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

