import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const ttsSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000, 'Text too long (max 5000 characters)'),
  voice: z.enum(['shimmer', 'alloy', 'echo', 'fable', 'onyx', 'nova']).default('shimmer'),
  speed: z.number().min(0.25).max(4.0).default(0.94)
})

serve(async (req) => {
  console.log('🚀 text-to-speech started')
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate input
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('📦 Request body received, text length:', body.text?.length || 0)
    
    console.log('📝 Validating input...')
    const validated = ttsSchema.parse(body)
    const { text, voice, speed } = validated
    console.log('✅ Input validated - voice:', voice, 'speed:', speed)

    console.log('🎙️ Generating speech for text (first 100 chars):', text.substring(0, 100))
    
    // Check API key
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      console.log('❌ OPENAI_API_KEY not found')
      throw new Error('OPENAI_API_KEY not configured')
    }
    console.log('✅ OPENAI_API_KEY found')

    // Generate speech from text using OpenAI
    console.log('🤖 Calling OpenAI TTS API...')
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: text,
        voice: voice,
        speed: speed,
        response_format: 'mp3',
      }),
    })

    console.log('📨 OpenAI response status:', response.status)
    
    if (!response.ok) {
      const error = await response.text()
      console.log('❌ OpenAI TTS error:', response.status, error)
      throw new Error(`Failed to generate speech: ${error}`)
    }

    console.log('✅ Speech generated successfully')
    
    // Get audio buffer
    console.log('📦 Converting to audio buffer...')
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = new Uint8Array(arrayBuffer)
    console.log('✅ Audio buffer created, size:', audioBuffer.length, 'bytes')

    // Upload to Supabase Storage
    console.log('☁️ Uploading to Supabase Storage...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const fileName = `gist-${Date.now()}.mp3`
    console.log('📁 File name:', fileName)
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gist-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      })

    if (uploadError) {
      console.log('❌ Upload error:', uploadError.message)
      throw new Error(`Failed to upload audio: ${uploadError.message}`)
    }

    console.log('✅ File uploaded:', uploadData.path)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('gist-audio')
      .getPublicUrl(fileName)

    console.log('✅ Audio uploaded successfully:', publicUrl)

    return new Response(
      JSON.stringify({ audioUrl: publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.log('❌ Error in text-to-speech function:', error instanceof Error ? error.message : 'Unknown error')
    console.log('📚 Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
