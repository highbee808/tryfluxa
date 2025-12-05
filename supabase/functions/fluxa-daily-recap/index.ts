import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-signature",
};

// HMAC signature validation for scheduled functions
async function validateCronSignature(req: Request): Promise<boolean> {
  const signature = req.headers.get('x-cron-signature')
  const cronSecret = Deno.env.get('CRON_SECRET')
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return false
  }
  
  if (!signature) {
    console.error('Missing x-cron-signature header')
    return false
  }
  
  const body = await req.text()
  const encoder = new TextEncoder()
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(cronSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body || '')
  )
  
  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)))
  
  return signature === expectedBase64
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  // Validate HMAC signature for scheduled functions
  const isValid = await validateCronSignature(req)
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid signature' }),
      { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("📊 Generating Fluxa's daily recap...");

    // Get top 3 gists from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: gists, error: gistsError } = await supabase
      .from("gists")
      .select("*")
      .eq("status", "published")
      .gte("published_at", today.toISOString())
      .order("play_count", { ascending: false })
      .limit(3);

    if (gistsError) throw gistsError;

    if (!gists || gists.length === 0) {
      return new Response(
        JSON.stringify({ message: "No gists for today's recap" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create recap message
    const headlines = gists.map(g => g.headline).join(", ");
    const recapText = `Alright gossip fam 😘 here's your daily recap: ${headlines}. That's your tea for today — see you tomorrow! 💋`;

    // Generate TTS for recap
    const { data: ttsData, error: ttsError } = await supabase.functions.invoke(
      "text-to-speech",
      {
        body: {
          text: recapText,
          voice: "shimmer",
          speed: 0.94,
        },
      }
    );

    if (ttsError) {
      console.error("❌ TTS error:", ttsError);
      // Return text only if TTS fails
      return new Response(
        JSON.stringify({ 
          text: recapText,
          gists,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✨ Daily recap ready!");

    return new Response(
      JSON.stringify({
        text: recapText,
        audioUrl: ttsData.audioUrl,
        gists,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error generating recap:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});