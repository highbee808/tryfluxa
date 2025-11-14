import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("🎙️ Voice-to-Fluxa started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_KEY) throw new Error("Missing OPENAI_API_KEY");

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("file") as File;

    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    // Validate file type
    const ALLOWED_AUDIO_TYPES = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/m4a'
    ];
    
    if (!ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      throw new Error('Invalid file type. Only audio files allowed.');
    }

    // Check file size (10MB limit)
    if (audioFile.size > 10 * 1024 * 1024) {
      throw new Error("File size exceeds 10MB limit");
    }

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

    // Return response
    const response = {
      userSpeech,
      fluxaReply,
      audioUrl,
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
