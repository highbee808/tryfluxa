import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!supabaseUrl || !adminSecret) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing env vars" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
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

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to reach Supabase Edge Function",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

