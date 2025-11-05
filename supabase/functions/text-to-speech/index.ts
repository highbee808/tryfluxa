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
    console.log('🎤 text-to-speech started')
    
    // Validate input
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('📦 Request body keys:', Object.keys(body))
    console.log('📦 Text length:', body.text?.length || 0, 'characters')
    
    console.log('📝 Validating input with Zod...')
    let validated
    try {
      validated = ttsSchema.parse(body)
    } catch (validationError: any) {
      console.log('❌ Validation failed:', validationError.message)
      return new Response(
        JSON.stringify({ success: false, error: `Validation failed: ${validationError.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    const { text, voice, speed } = validated
    console.log('✅ Input validated successfully')
    console.log('🎙️ Voice:', voice, '| Speed:', speed)
    console.log('🗣️ Text preview (first 100 chars):', text.substring(0, 100))
    
    // Check API key
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      console.error('[CONFIG] Missing required API key')
      throw new Error('Service configuration error')
    }

    // Generate speech from text using OpenAI
    console.log('🎙️ Fluxa is recording her voice...')
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
      console.error('[TTS] Speech generation failed:', response.status)
      throw new Error('Speech generation failed')
    }

    console.log('✅ Fluxa finished recording!')
    
    // Get audio buffer
    console.log('📦 Converting response to audio buffer...')
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = new Uint8Array(arrayBuffer)
    console.log('✅ Audio buffer created')
    console.log('📊 Buffer size:', audioBuffer.length, 'bytes', '(', (audioBuffer.length / 1024).toFixed(2), 'KB)')

    // Upload to Supabase Storage
    console.log('☁️ Uploading to Supabase Storage...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const fileName = `gist-${Date.now()}.mp3`
    console.log('📁 Generated filename:', fileName)
    
    console.log('☁️ Uploading to Supabase Storage bucket: gist-audio...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gist-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      })

    if (uploadError) {
      console.log('❌ Storage upload error:', uploadError.message)
      console.log('❌ Upload error details:', JSON.stringify(uploadError))
      throw new Error('Failed to save audio file')
    }

    console.log('✅ File uploaded successfully to storage')
    console.log('📂 Storage path:', uploadData.path)

    // Get public URL
    console.log('🔗 Generating public URL...')
    const { data: { publicUrl } } = supabase.storage
      .from('gist-audio')
      .getPublicUrl(fileName)

    console.log('✅ Public URL generated:', publicUrl)
    console.log('🎉 text-to-speech complete!')

    return new Response(
      JSON.stringify({ audioUrl: publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('[ERROR] text-to-speech failed:', error)
    
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
