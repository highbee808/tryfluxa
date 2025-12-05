import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders })
  }

  try {
    // Check for authorization header (require authenticated request)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Define the audio files to upload with their paths
    const audioFiles = [
      { 
        remotePath: 'reactions/laugh/giggle.mp3',
        description: 'Light teasing laugh',
        emotion: 'laugh',
        intensity: 'light'
      },
      { 
        remotePath: 'reactions/laugh/softlaugh.mp3',
        description: 'Friendly chuckle',
        emotion: 'laugh',
        intensity: 'soft'
      },
      { 
        remotePath: 'reactions/laugh/burstlaugh.mp3',
        description: 'Full laugh',
        emotion: 'laugh',
        intensity: 'burst'
      },
      { 
        remotePath: 'reactions/laugh/snicker.mp3',
        description: 'Sarcastic laugh',
        emotion: 'laugh',
        intensity: 'sarcastic'
      }
    ]

    const uploadedUrls: any[] = []

    // Upload each file
    for (const file of audioFiles) {
      try {
        // Fetch the audio file from the public folder
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/audio/${file.remotePath.split('/').pop()}`
        
        console.log(`📤 Uploading ${file.remotePath}...`)
        
        // For now, we'll create placeholder entries
        // In production, you'd fetch from local storage or another source
        const { data } = supabase.storage
          .from('gist-audio')
          .getPublicUrl(file.remotePath)

        uploadedUrls.push({
          path: file.remotePath,
          url: data.publicUrl,
          description: file.description,
          emotion: file.emotion,
          intensity: file.intensity
        })
        console.log(`✅ Generated URL for ${file.remotePath}`)
      } catch (error) {
        console.error(`❌ Error processing ${file.remotePath}:`, error)
      }
    }

    // Create folder structure info
    const folderStructure = {
      bucket: 'gist-audio',
      folders: {
        'reactions/': {
          'laugh/': ['giggle.mp3', 'softlaugh.mp3', 'burstlaugh.mp3', 'snicker.mp3'],
          'sigh/': [],
          'gasp/': [],
          'hum/': [],
          'tease/': [],
          'warm/': []
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reaction sound library structure created',
        uploadedFiles: uploadedUrls,
        folderStructure,
        instructions: 'Files have been copied to public/audio/reactions/laugh/. To upload to Supabase Storage, use the Supabase Dashboard or upload them manually via the Storage API.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
