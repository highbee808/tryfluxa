import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiting: Track usage per user
const usageTracker = new Map<string, { count: number; resetTime: number; totalCost: number }>();

// Constants for rate limiting and cost tracking
const RATE_LIMIT_REQUESTS = 20; // Max requests per hour during testing
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// OpenAI API costs (per 1M units)
const COSTS = {
  WHISPER_PER_MINUTE: 0.006,
  GPT4O_MINI_INPUT_PER_M: 0.15,
  GPT4O_MINI_OUTPUT_PER_M: 0.60,
  TTS_PER_M_CHARS: 15.00,
};

function estimateCost(audioSeconds: number, inputChars: number, outputChars: number, ttsChars: number) {
  const whisperCost = (audioSeconds / 60) * COSTS.WHISPER_PER_MINUTE;
  const gptInputCost = (inputChars / 1_000_000) * COSTS.GPT4O_MINI_INPUT_PER_M;
  const gptOutputCost = (outputChars / 1_000_000) * COSTS.GPT4O_MINI_OUTPUT_PER_M;
  const ttsCost = (ttsChars / 1_000_000) * COSTS.TTS_PER_M_CHARS;
  
  return whisperCost + gptInputCost + gptOutputCost + ttsCost;
}

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; totalCost: number } {
  const now = Date.now();
  const userUsage = usageTracker.get(userId);

  if (!userUsage || now > userUsage.resetTime) {
    // Reset or initialize
    usageTracker.set(userId, { count: 0, resetTime: now + RATE_LIMIT_WINDOW, totalCost: 0 });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS, totalCost: 0 };
  }

  if (userUsage.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, totalCost: userUsage.totalCost };
  }

  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - userUsage.count, totalCost: userUsage.totalCost };
}

function trackUsage(userId: string, cost: number) {
  const userUsage = usageTracker.get(userId);
  if (userUsage) {
    userUsage.count++;
    userUsage.totalCost += cost;
  }
}

serve(async (req) => {
  console.log("🎙️ Voice-to-Fluxa (with rate limiting) started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) throw new Error("Missing OPENAI_API_KEY");

    // Get user from auth header (for tracking only during testing)
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let userId = "anonymous";
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        userId = user.id;
      }
    }

    // Check rate limit
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      console.log(`⚠️ Rate limit exceeded for user ${userId}`);
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          remaining: 0,
          totalCost: rateCheck.totalCost.toFixed(4),
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Rate limit check passed. Remaining: ${rateCheck.remaining}`);

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("file") as File;

    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    // Check file size (60MB limit)
    if (audioFile.size > 60 * 1024 * 1024) {
      throw new Error("File size exceeds 60MB limit");
    }

    const audioSeconds = audioFile.size / 16000; // Rough estimate
    console.log("📁 Audio file received:", audioFile.name, audioFile.size, "bytes");

    // Step 1: Transcribe audio with Whisper
    console.log("🎧 Transcribing audio with Whisper...");
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", "whisper-1");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: whisperFormData,
    });

    if (!whisperRes.ok) {
      const errorText = await whisperRes.text();
      console.error("[WHISPER] Error:", errorText);
      throw new Error("Whisper transcription failed");
    }

    const whisperData = await whisperRes.json();
    const userSpeech = whisperData.text;
    console.log("✅ Transcription:", userSpeech);

    // Step 2: Generate Fluxa's reply
    console.log("💭 Generating Fluxa's reply...");

    // Get context from recent gists
    const { data: gists } = await supabase
      .from("gists")
      .select("headline, topic, context")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3);

    const contextStr = gists
      ?.map((g) => `${g.topic}: ${g.headline}`)
      .join(". ") || "";

    const systemPrompt = `You are Fluxa, a Gen Z bestie who keeps it real with the latest tea. You're witty, playful, and always in the know. Recent topics: ${contextStr}. Keep responses under 50 words, casual and fun.`;
    const inputChars = systemPrompt.length + userSpeech.length;

    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userSpeech },
        ],
        max_tokens: 150,
        temperature: 0.9,
      }),
    });

    if (!chatRes.ok) {
      const errorText = await chatRes.text();
      console.error("[CHAT] Error:", errorText);
      throw new Error("Chat generation failed");
    }

    const chatData = await chatRes.json();
    const fluxaReply = chatData.choices[0].message.content;
    const outputChars = fluxaReply.length;
    console.log("✅ Fluxa reply:", fluxaReply);

    // Step 3: Convert reply to speech
    console.log("🎙️ Synthesizing speech...");
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: fluxaReply,
        voice: "shimmer",
        speed: 0.94,
        response_format: "mp3",
      }),
    });

    if (!ttsRes.ok) {
      const errorText = await ttsRes.text();
      console.error("[TTS] Error:", errorText);
      throw new Error("TTS synthesis failed");
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    // Upload to Supabase storage
    const audioFileName = `voice-reply-${Date.now()}.mp3`;
    console.log("☁️ Uploading audio to storage:", audioFileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("gist-audio")
      .upload(audioFileName, audioBytes, { contentType: "audio/mpeg", upsert: false });

    if (uploadError) {
      console.error("[UPLOAD] Error:", uploadError);
      throw new Error("Failed to upload audio");
    }

    const {
      data: { publicUrl: audioUrl },
    } = supabase.storage.from("gist-audio").getPublicUrl(audioFileName) as any;

    console.log("✅ Audio URL:", audioUrl);

    // Calculate and track cost
    const estimatedCost = estimateCost(audioSeconds, inputChars, outputChars, fluxaReply.length);
    trackUsage(userId, estimatedCost);
    
    const updatedUsage = usageTracker.get(userId);
    console.log(`💰 Cost: $${estimatedCost.toFixed(4)} | Total: $${updatedUsage?.totalCost.toFixed(4)} | Remaining: ${RATE_LIMIT_REQUESTS - (updatedUsage?.count || 0)}`);

    // Return response
    const response = {
      userSpeech,
      fluxaReply,
      audioUrl,
      usage: {
        remaining: RATE_LIMIT_REQUESTS - (updatedUsage?.count || 0),
        totalCost: (updatedUsage?.totalCost || 0).toFixed(4),
        estimatedCost: estimatedCost.toFixed(4),
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ERROR] Voice-to-Fluxa failed:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
