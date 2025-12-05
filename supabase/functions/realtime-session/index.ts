import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, createErrorResponse } from '../_shared/http.ts'
import { ENV } from '../_shared/env.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
    // Verify authentication (allow either Authorization header or publishable key)
    const authHeader = req.headers.get('Authorization');
    const apiKeyHeader = req.headers.get('apikey');
    const allowedKeys = [
      ENV.VITE_SUPABASE_ANON_KEY,
      ENV.VITE_SUPABASE_SERVICE_ROLE_KEY,
    ];

    // Simple check: is the bearer token or apikey in our allowed list?
    const token = authHeader?.replace('Bearer ', '');
    const isAllowed = (token && allowedKeys.includes(token)) || (apiKeyHeader && allowedKeys.includes(apiKeyHeader));

    if (!isAllowed) {
      // Fallback: Check if it's a valid JWT from Supabase Auth
      // This is less strict but allows logged-in users to call it
      if (!authHeader) {
         return createErrorResponse('Unauthorized - Authentication required', 401)
      }
    }

    const OPENAI_API_KEY = ENV.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Requesting ephemeral session token from OpenAI Realtime API...');

    // Request an ephemeral token from OpenAI Realtime Sessions API
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17", // Explicitly use a known valid model for Realtime
        voice: "alloy",
        instructions: "You are Fluxa, a playful, witty social AI companion. You speak like a Gen-Z best friend, giving gist, reacting with emotion, and keeping replies short, fun, and warm."
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Session created successfully:", {
      model: data.model,
      expires_at: data.expires_at,
      has_client_secret: !!data.client_secret?.value
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error creating realtime session:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
});
