import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY || !supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables");
      return new Response(JSON.stringify({ error: "Server misconfigured: missing API keys" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1) Read audio file from multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎙️ Received audio file:", file.name, file.type, file.size);

    // 2) Transcribe with Whisper
    const whisperForm = new FormData();
    whisperForm.append("file", file);
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "json");

    console.log("🧠 Sending to Whisper...");
    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: whisperForm,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text().catch(() => "");
      console.error("Whisper error:", whisperRes.status, errText);
      return new Response(JSON.stringify({ error: "Audio processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const whisperJson: any = await whisperRes.json();
    const userSpeech: string = whisperJson.text ?? "";
    console.log("📝 Transcription:", userSpeech);

    if (!userSpeech.trim()) {
      return new Response(JSON.stringify({ error: "Empty transcription", userSpeech }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Generate Fluxa's reply using GPT
    console.log("💬 Asking Fluxa (GPT) for a reply...");
    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Fluxa, a playful, witty social AI companion. Reply like a Gen-Z friend giving gist: short, fun, warm, with natural emotion. You can giggle, tease lightly, and be encouraging. Keep answers under 3 short sentences.",
          },
          {
            role: "user",
            content: userSpeech,
          },
        ],
        temperature: 0.8,
      }),
    });

    if (!chatRes.ok) {
      const errText = await chatRes.text().catch(() => "");
      console.error("Chat error:", chatRes.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate response", userSpeech }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatJson: any = await chatRes.json();
    const fluxaReply: string =
      chatJson.choices?.[0]?.message?.content?.trim() || "Haha, my brain glitched for a sec. Say that again?";

    console.log("💜 Fluxa reply:", fluxaReply);

    // 4) Generate TTS for Fluxa's reply
    console.log("🎧 Creating voice for Fluxa...");
    const emotionalMarkup = `<tone emotion="playful">${fluxaReply}</tone>`;

    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: emotionalMarkup,
        response_format: "mp3",
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text().catch(() => "");
      console.error("TTS error:", ttsRes.status, errText);
      // Fallback: return text-only
      return new Response(JSON.stringify({ userSpeech, fluxaReply, audioUrl: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioArrayBuffer = await ttsRes.arrayBuffer();
    const audioBytes = new Uint8Array(audioArrayBuffer);

    // 5) Upload mp3 to Supabase Storage (gist-audio bucket)
    const fileName = `fluxa-voice-${Date.now()}.mp3`;
    const bucketName = "gist-audio";

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, audioBytes, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ userSpeech, fluxaReply, audioUrl: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { publicUrl: audioUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(fileName) as any;

    console.log("✅ Fluxa voice URL:", audioUrl);

    // 6) Send final JSON back
    return new Response(JSON.stringify({ userSpeech, fluxaReply, audioUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error in voice-to-fluxa:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
