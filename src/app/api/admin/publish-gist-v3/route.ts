// Vercel serverless function - proxy for admin Edge Functions
export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!supabaseUrl || !adminSecret) {
      return new Response(
        JSON.stringify({
          error: "Server misconfiguration: missing SUPABASE_URL or ADMIN_SECRET",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();

    const response = await fetch(
      `${supabaseUrl}/functions/v1/publish-gist-v3`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify(body),
      }
    );

    const text = await response.text();

    return new Response(text, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Failed to reach Supabase Edge Function",
        details: err.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

