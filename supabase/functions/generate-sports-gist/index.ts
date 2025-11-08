import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-signature',
}

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    console.log('⚽ Generating sports banter...')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // Get all users with team preferences
    const { data: userTeams, error: userError } = await supabase
      .from('user_teams')
      .select('*')

    if (userError) {
      throw userError
    }

    if (!userTeams || userTeams.length === 0) {
      console.log('No users with team preferences found')
      return new Response(
        JSON.stringify({ success: true, message: 'No users to generate banter for' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get today's finished matches
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: matches, error: matchError } = await supabase
      .from('match_results')
      .select('*')
      .eq('status', 'Final')
      .gte('match_date', today.toISOString())

    if (matchError) {
      throw matchError
    }

    if (!matches || matches.length === 0) {
      console.log('No finished matches today')
      return new Response(
        JSON.stringify({ success: true, message: 'No matches to generate banter for' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${matches.length} matches for ${userTeams.length} users`)

    let banterGenerated = 0

    // For each user, check if any of their teams played
    for (const user of userTeams) {
      const favoriteTeams = user.favorite_teams || []
      const rivalTeams = user.rival_teams || []

      for (const match of matches) {
        let mood = ''
        let userTeam = ''
        let isAboutRival = false

        // Check if user's favorite team played
        if (favoriteTeams.includes(match.team_home) || favoriteTeams.includes(match.team_away)) {
          const isFavoriteHome = favoriteTeams.includes(match.team_home)
          const favoriteScore = isFavoriteHome ? match.score_home : match.score_away
          const oppositionScore = isFavoriteHome ? match.score_away : match.score_home
          userTeam = isFavoriteHome ? match.team_home : match.team_away

          if (favoriteScore > oppositionScore) {
            mood = 'victory'
          } else if (favoriteScore < oppositionScore) {
            mood = 'defeat'
          } else {
            mood = 'draw'
          }
        }
        // Check if user's rival team played
        else if (rivalTeams.includes(match.team_home) || rivalTeams.includes(match.team_away)) {
          const isRivalHome = rivalTeams.includes(match.team_home)
          const rivalScore = isRivalHome ? match.score_home : match.score_away
          const oppositionScore = isRivalHome ? match.score_away : match.score_home
          userTeam = isRivalHome ? match.team_home : match.team_away
          isAboutRival = true

          if (rivalScore < oppositionScore) {
            mood = 'rival_loss'
          } else if (rivalScore > oppositionScore) {
            mood = 'rival_win'
          } else {
            mood = 'rival_draw'
          }
        }

        // If relevant match found, generate banter
        if (mood) {
          const prompt = `Generate a short, witty sports banter commentary (2-3 sentences max) for this match result:

${match.team_home} ${match.score_home} - ${match.score_away} ${match.team_away}
${match.league}

Context:
${isAboutRival ? `This is the user's RIVAL team: ${userTeam}` : `This is the user's FAVORITE team: ${userTeam}`}
Mood: ${mood}

Style requirements:
- Write in Fluxa's playful, gossip-style voice
- ${mood === 'victory' ? 'Celebratory and hyped 🎉' : ''}
- ${mood === 'defeat' ? 'Consoling but optimistic 💪' : ''}
- ${mood === 'rival_loss' ? 'Playfully mocking and smug 😏' : ''}
- ${mood === 'rival_win' ? 'Annoyed but defiant 😤' : ''}
- ${mood === 'draw' ? 'Neutral but engaging' : ''}
- Keep it fun and engaging, never mean-spirited
- No hashtags

Return only the commentary text, nothing else.`

          // Generate banter using OpenAI gpt-4o-mini
          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are Fluxa, a witty AI sports commentator with a playful personality.' },
                { role: 'user', content: prompt }
              ],
            }),
          })

          if (!aiResponse.ok) {
            console.error('AI API error:', aiResponse.status)
            continue
          }

          const aiData = await aiResponse.json()
          const commentary = aiData.choices[0].message.content.trim()

          // Create gist for this user
          const headline = `${match.team_home} ${match.score_home}-${match.score_away} ${match.team_away}`
          const script = `${headline}. ${commentary}`

          // Check if we already created a gist for this match and user
          const { data: existingGist } = await supabase
            .from('gists')
            .select('id')
            .eq('topic', headline)
            .eq('meta->user_id', user.user_id)
            .single()

          if (existingGist) {
            console.log(`Gist already exists for user ${user.user_id} and match ${match.match_id}`)
            continue
          }

          // Generate Fluxa voice audio using TTS
          console.log('🎙️ Generating Fluxa audio reaction...')
          let audioUrl = ''
          
          try {
            const ttsResponse = await supabase.functions.invoke('text-to-speech', {
              body: { 
                text: commentary, 
                voice: 'shimmer',
                speed: 0.94
              }
            })

            if (ttsResponse.data?.audioUrl) {
              audioUrl = ttsResponse.data.audioUrl
              console.log('✅ Audio generated:', audioUrl)
            } else {
              console.error('TTS error:', ttsResponse.error)
            }
          } catch (ttsError) {
            console.error('Failed to generate TTS:', ttsError)
          }

          // Insert gist with audio (published if audio generated, draft if not)
          const { error: gistError } = await supabase
            .from('gists')
            .insert({
              topic: headline,
              headline: headline,
              context: `${match.league} match result`,
              script: script,
              narration: commentary,
              audio_url: audioUrl,
              topic_category: 'Sports Banter',
              status: audioUrl ? 'published' : 'draft',
              meta: {
                user_id: user.user_id,
                match_id: match.match_id,
                mood: mood,
                team: userTeam,
              },
              news_published_at: match.match_date,
            })

          if (gistError) {
            console.error('Error creating gist:', gistError)
          } else {
            banterGenerated++
            console.log(`✅ Generated banter for user ${user.user_id}: ${headline}`)
          }
        }
      }
    }

    console.log(`✅ Generated ${banterGenerated} sports banter gists`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        generated: banterGenerated,
        message: `Generated ${banterGenerated} sports banter gists`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in generate-sports-gist:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
