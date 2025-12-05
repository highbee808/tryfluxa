import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
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

    const formData = await req.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      throw new Error('No audio file provided');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`[${user.id}] Starting streaming pipeline`);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
        };

        try {
          sendEvent('status', { message: 'Transcribing...' });
          
          const transcribeFormData = new FormData();
          transcribeFormData.append('file', audioFile);
          transcribeFormData.append('model', 'whisper-1');

          const transcribeResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            body: transcribeFormData,
          });

          if (!transcribeResponse.ok) {
            throw new Error('Transcription failed');
          }

          const { text: transcript } = await transcribeResponse.json();
          console.log(`[${user.id}] Transcript: "${transcript}"`);
          
          sendEvent('transcript', { text: transcript });

          const { data: recentMemories } = await supabase
            .from('fluxa_brain')
            .select('memory_text, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

          const contextPrompt = recentMemories && recentMemories.length > 0
            ? `\n\nRecent conversation context:\n${recentMemories.map(m => m.memory_text).join('\n')}`
            : '';

          sendEvent('status', { message: 'Fluxa is thinking...' });
          
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
              temperature: 0.8,
              stream: true,
            }),
          });

          if (!chatResponse.ok) {
            throw new Error('GPT response failed');
          }

          let fullResponse = '';
          const reader = chatResponse.body!.getReader();
          const decoder = new TextDecoder();

          let currentChunk = '';

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
                    currentChunk += content;
                    
                    sendEvent('partial_text', { text: content });

                    if (currentChunk.match(/[.!?]\s*$/)) {
                      const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${OPENAI_API_KEY}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          model: 'tts-1',
                          voice: 'alloy',
                          input: currentChunk.trim(),
                          response_format: 'mp3',
                          speed: 1.1,
                        }),
                      });

                      if (ttsResponse.ok) {
                        const audioBuffer = await ttsResponse.arrayBuffer();
                        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
                        sendEvent('audio_chunk', { audio: base64Audio });
                      }

                      currentChunk = '';
                    }
                  }
                } catch (e) {
                  console.error('Error parsing SSE:', e);
                }
              }
            }
          }

          if (currentChunk.trim()) {
            const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'tts-1',
                voice: 'alloy',
                input: currentChunk.trim(),
                response_format: 'mp3',
                speed: 1.1,
              }),
            });

            if (ttsResponse.ok) {
              const audioBuffer = await ttsResponse.arrayBuffer();
              const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
              sendEvent('audio_chunk', { audio: base64Audio });
            }
          }

          console.log(`[${user.id}] Full response: "${fullResponse}"`);

          await supabase.from('voice_chat_history').insert({
            user_id: user.id,
            user_message: transcript,
            fluxa_reply: fullResponse,
            emotion: 'playful',
            audio_url: '',
          });

          await supabase.from('fluxa_brain').upsert({
            user_id: user.id,
            memory_text: `User: ${transcript}\nFluxa: ${fullResponse}`,
          });

          sendEvent('done', { 
            transcript, 
            response: fullResponse 
          });

        } catch (error) {
          console.error('Streaming error:', error);
          sendEvent('error', { message: (error as Error).message });
        } finally {
          controller.close();
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
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
