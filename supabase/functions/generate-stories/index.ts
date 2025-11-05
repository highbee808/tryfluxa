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
    return new Response(null, { headers: corsHeaders });
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

    console.log("📸 Generating daily Fluxa stories...");

    // Get top 5 trending gists from last 24 hours
    const { data: gists, error: gistsError } = await supabase
      .from("gists")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5);

    if (gistsError) throw gistsError;

    if (!gists || gists.length === 0) {
      console.log("⚠️ No gists available for stories");
      return new Response(
        JSON.stringify({ message: "No gists available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create stories from gists
    const stories = [];
    for (const gist of gists) {
      const story = {
        gist_id: gist.id,
        title: gist.headline,
        image_url: gist.image_url,
        audio_url: gist.audio_url,
        duration: 30,
      };

      const { data, error } = await supabase
        .from("stories")
        .insert(story)
        .select()
        .single();

      if (error) {
        console.error("❌ Failed to create story:", error);
        continue;
      }

      stories.push(data);
    }

    console.log(`✨ Created ${stories.length} Fluxa stories`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        stories,
        message: `Generated ${stories.length} stories` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error generating stories:", error);
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