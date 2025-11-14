import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      throw new Error('No audio file provided');
    }

    // Validate file type and size
    const allowedTypes = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'];
    if (!allowedTypes.includes(audioFile.type)) {
      throw new Error('Invalid audio file type');
    }

    if (audioFile.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Audio file too large (max 10MB)');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`[${user.id}] Processing audio file (${audioFile.size} bytes)`);

    // Step 1: Transcribe audio using Whisper
    const transcribeFormData = new FormData();
    transcribeFormData.append('file', audioFile);
    transcribeFormData.append('model', 'whisper-1');

    const transcribeResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: transcribeFormData,
    });

    if (!transcribeResponse.ok) {
      const error = await transcribeResponse.text();
      console.error('Whisper transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }

    const { text: transcript } = await transcribeResponse.json();
    console.log(`[${user.id}] Transcript: "${transcript}"`);

    // Step 2: Get recent context from Fluxa brain
    const { data: recentMemories } = await supabase
      .from('fluxa_brain')
      .select('memory_text, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const contextPrompt = recentMemories && recentMemories.length > 0
      ? `\n\nRecent conversation context:\n${recentMemories.map(m => m.memory_text).join('\n')}`
      : '';

    // Step 3: Stream response from GPT
    const systemPrompt = `You are Fluxa, the playful, witty, social AI companion. Respond in a warm Gen-Z tone with short sentences and natural emotion. Sometimes add mild laughter or teasing in context. Keep responses conversational and under 100 words.${contextPrompt}`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        stream: true,
        max_tokens: 150,
      }),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      console.error('Chat completion error:', error);
      throw new Error('Failed to generate response');
    }

    // Create a readable stream to send SSE events
    const stream = new ReadableStream({
      async start(controller) {
        const reader = chatResponse.body!.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    fullResponse += content;
                    // Send partial update
                    controller.enqueue(
                      new TextEncoder().encode(
                        JSON.stringify({ event: 'partial', text: content }) + '\n'
                      )
                    );
                  }
                } catch (e) {
                  console.warn('Failed to parse SSE chunk:', e);
                }
              }
            }
          }

          console.log(`[${user.id}] Full response: "${fullResponse}"`);

          // Step 4: Detect emotion and generate TTS
          const emotion = detectEmotion(fullResponse);
          const emotionalText = wrapWithEmotion(fullResponse, emotion);

          console.log(`[${user.id}] Generating TTS with emotion: ${emotion}`);

          const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'tts-1',
              voice: 'alloy',
              input: emotionalText,
              format: 'mp3',
            }),
          });

          if (!ttsResponse.ok) {
            throw new Error('Failed to generate speech');
          }

          const audioBuffer = await ttsResponse.arrayBuffer();

          // Step 5: Upload audio to Supabase Storage
          const fileName = `voice-replies/${user.id}/${Date.now()}.mp3`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('gist-audio')
            .upload(fileName, audioBuffer, {
              contentType: 'audio/mpeg',
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Failed to upload audio');
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('gist-audio')
            .getPublicUrl(fileName);

          console.log(`[${user.id}] Audio uploaded: ${publicUrl}`);

          // Step 6: Save conversation to history
          await supabase.from('voice_chat_history').insert({
            user_id: user.id,
            user_message: transcript,
            fluxa_reply: fullResponse,
            audio_url: publicUrl,
            emotion: emotion,
          });

          // Step 7: Update Fluxa brain memory
          await supabase.from('fluxa_brain').insert({
            user_id: user.id,
            memory_text: `User: ${transcript}\nFluxa: ${fullResponse}`,
            memory_type: 'voice_chat',
          });

          // Send final response
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                event: 'done',
                text: fullResponse,
                audioUrl: publicUrl,
                emotion: emotion,
              }) + '\n'
            )
          );

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Voice-to-Fluxa error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function detectEmotion(text: string): string {
  const lower = text.toLowerCase();
  
  if (lower.match(/ha+h+a+|lol|lmao|😂|funny|hilarious/)) return 'playful';
  if (lower.match(/oh no|sorry|sad|unfortunately|😔/)) return 'empathetic';
  if (lower.match(/yay|great|awesome|amazing|excited|🎉/)) return 'excited';
  if (lower.match(/wow|omg|no way|really\?|😱/)) return 'surprised';
  if (lower.match(/hmm|thinking|interesting|curious/)) return 'thoughtful';
  if (lower.match(/aww|sweet|love|care|💕/)) return 'warm';
  
  return 'friendly';
}

function wrapWithEmotion(text: string, emotion: string): string {
  // Add subtle emotional markup for TTS
  const toneMap: Record<string, string> = {
    playful: 'cheerful',
    empathetic: 'gentle',
    excited: 'enthusiastic',
    surprised: 'amazed',
    thoughtful: 'calm',
    warm: 'affectionate',
    friendly: 'conversational',
  };
  
  const tone = toneMap[emotion] || 'conversational';
  return `<speak><prosody rate="medium" pitch="medium">${text}</prosody></speak>`;
}
