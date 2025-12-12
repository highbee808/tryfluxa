import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!supabaseUrl || !adminSecret) {
    return res.status(500).json({
      error: "Server misconfiguration: missing SUPABASE_URL or ADMIN_SECRET",
    });
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
        body: JSON.stringify(req.body),
      }
    );

    const text = await response.text();

    res.status(response.status).send(text);
  } catch (err: any) {
    res.status(500).json({
      error: "Failed to reach Supabase Edge Function",
      details: err.message,
    });
  }
}

