import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Validation schema
const ttsSchema = z.object({
  text: z.string().min(1, "Text is required").max(5000, "Text too long (max 5000 characters)"),
  voice: z.enum(["shimmer", "alloy", "echo", "fable", "onyx", "nova"]).default("shimmer"),
  speed: z.number().min(0.25).max(4.0).default(0.94),
  personality: z.enum(["friendly", "teasing", "calm", "excited"]).optional(),
});

// Simple emotion detector (expandable)
function detectEmotion(text: string) {
  const t = text.toLowerCase();
  if (t.includes("😂") || /(\b(haha|lol|lmao|rofl)\b)/i.test(t)) return "laugh";
  if (t.includes("😭") || /(\b(sad|unfortunate|lost|sorry)\b)/i.test(t)) return "sigh";
  if (t.includes("😱") || /(\b(wow|omg|what a)\b)/i.test(t)) return "gasp";
  if (t.includes("😏") || /(\b(tease|smh|smirk)\b)/i.test(t)) return "tease";
  if (t.includes("🤔") || /(\b(hmm|hmmm|thinking)\b)/i.test(t)) return "hum";
  if (t.includes("❤️") || /(\b(love|heart)\b)/i.test(t)) return "warm";
  return "neutral";
}

// Reaction library mapping (bucket paths)
const REACTION_BUCKET = "fluxa-reactions";
const REACTION_PATHS: Record<string, string[]> = {
  laugh: [
    "reactions/laugh/giggle.mp3",
    "reactions/laugh/softlaugh.mp3",
    "reactions/laugh/burstlaugh.mp3",
    "reactions/laugh/snicker.mp3",
  ],
  sigh: ["reactions/sigh/sigh-soft.mp3", "reactions/sigh/sigh-heavy.mp3"],
  gasp: ["reactions/gasp/gasp-short.mp3", "reactions/gasp/gasp-wow.mp3"],
  hum: ["reactions/hum/hum-calm.mp3", "reactions/hum/hum-think.mp3"],
  tease: ["reactions/tease/tease-chuckle.mp3", "reactions/tease/tease-smirk.mp3"],
  warm: ["reactions/warm/warm-1.mp3"],
};

function pickReactionPath(emotion: string) {
  const set = REACTION_PATHS[emotion] ?? [];
  if (set.length === 0) return null;
  return set[Math.floor(Math.random() * set.length)];
}

serve(async (req) => {
  console.log("🚀 Fluxa TTS v2.0 started");

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const validated = ttsSchema.parse(body);
    const { text, voice, speed, personality } = validated;

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) throw new Error("Missing OPENAI_API_KEY");

    // Detect emotion and personality tag (fallback to optional personality)
    const emotion = detectEmotion(text);
    const personalityTag = personality ?? (emotion === "laugh" ? "teasing" : "friendly");
    console.log("🎭 emotion:", emotion, "personality:", personalityTag);

    // Build emotional markup for TTS
    const emotionalMarkup = `<tone emotion="${emotion}" personality="${personalityTag}">${text}</tone>`;

    // Call OpenAI TTS
    console.log("🎙️ Requesting OpenAI TTS...");
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: emotionalMarkup,
        voice,
        speed,
        response_format: "mp3",
      }),
    });

    console.log("📨 OpenAI TTS status:", ttsRes.status);
    if (!ttsRes.ok) {
      const textErr = await ttsRes.text().catch(() => "");
      console.error("[TTS] OpenAI error:", textErr);
      throw new Error("OpenAI TTS failed");
    }

    const arrayBuffer = await ttsRes.arrayBuffer();
    const audioBytes = new Uint8Array(arrayBuffer);

    // Upload generated voice to storage (gist-audio bucket)
    const gistBucket = "gist-audio";
    const voiceFile = `fluxa-voice-${Date.now()}.mp3`;
    console.log("☁️ Upload voice to bucket:", gistBucket, voiceFile);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(gistBucket)
      .upload(voiceFile, audioBytes, { contentType: "audio/mpeg", upsert: false });

    if (uploadError) {
      console.error("[UPLOAD] voice upload error:", uploadError);
      throw new Error("Failed to upload generated voice");
    }

    const {
      data: { publicUrl: audioUrl },
    } = (await supabase.storage.from(gistBucket).getPublicUrl(voiceFile)) as any;

    console.log("✅ voiceUrl:", audioUrl);

    // Pick a reaction file (if available) and get its public URL
    let reactionUrl: string | null = null;
    const reactionPath = pickReactionPath(emotion);
    if (reactionPath) {
      try {
        const {
          data: { publicUrl },
        } = (await supabase.storage.from(REACTION_BUCKET).getPublicUrl(reactionPath)) as any;
        reactionUrl = publicUrl ?? null;
        console.log("🔊 reactionUrl:", reactionUrl);
      } catch (err) {
        console.warn("⚠️ Could not fetch reaction URL for", reactionPath, err);
        reactionUrl = null;
      }
    }

    // Response schema
    const payload = {
      audioUrl,
      reactionUrl,
      emotion,
      personalityTag,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ERROR] TTS v2.0 failed:", err);
    return new Response(JSON.stringify({ error: "Failed to process TTS request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
