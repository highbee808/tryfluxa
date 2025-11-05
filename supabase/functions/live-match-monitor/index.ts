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

interface MatchEvent {
  type: 'goal' | 'red_card' | 'full_time'
  team: string
  match_id: string
  score_home: number
  score_away: number
  team_home: string
  team_away: string
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
    console.log('🔴 Live match monitor started')
    
    const apiKey = Deno.env.get('SPORTSDATA_API_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!apiKey || !openaiKey) {
      throw new Error('Missing API keys')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch current live matches from database
    const { data: liveMatches } = await supabase
      .from('match_results')
      .select('*')
      .in('status', ['InProgress', 'Live', 'Halftime'])

    if (!liveMatches || liveMatches.length === 0) {
      console.log('No live matches found')
      return new Response(
        JSON.stringify({ message: 'No live matches' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Monitoring ${liveMatches.length} live matches`)
    const events: MatchEvent[] = []

    // Check each match for updates
    for (const match of liveMatches) {
      try {
        const response = await fetch(
          `https://api.sportsdata.io/v4/soccer/scores/json/Game/${match.match_id}`,
          {
            headers: { 'Ocp-Apim-Subscription-Key': apiKey },
          }
        )

        if (!response.ok) continue

        const liveData = await response.json()
        
        // Check for goal (score changed)
        if (liveData.HomeTeamScore !== match.score_home || liveData.AwayTeamScore !== match.score_away) {
          const scoringTeam = liveData.HomeTeamScore > match.score_home ? match.team_home : match.team_away
          events.push({
            type: 'goal',
            team: scoringTeam,
            match_id: match.match_id,
            score_home: liveData.HomeTeamScore,
            score_away: liveData.AwayTeamScore,
            team_home: match.team_home,
            team_away: match.team_away,
          })
        }

        // Check for full time
        if (match.status !== 'Final' && (liveData.Status === 'Final' || liveData.Status === 'FullTime')) {
          events.push({
            type: 'full_time',
            team: '',
            match_id: match.match_id,
            score_home: liveData.HomeTeamScore,
            score_away: liveData.AwayTeamScore,
            team_home: match.team_home,
            team_away: match.team_away,
          })
        }

        // Update match in database
        await supabase
          .from('match_results')
          .update({
            score_home: liveData.HomeTeamScore,
            score_away: liveData.AwayTeamScore,
            status: liveData.Status,
          })
          .eq('match_id', match.match_id)

      } catch (err) {
        console.error(`Error checking match ${match.match_id}:`, err)
      }
    }

    console.log(`Found ${events.length} events`)

    // Generate voice notifications for each event
    for (const event of events) {
      let notificationText = ''
      
      if (event.type === 'goal') {
        notificationText = `⚽ GOAL! ${event.team} strikes! It's now ${event.team_home} ${event.score_home} - ${event.score_away} ${event.team_away}. What a moment!`
      } else if (event.type === 'full_time') {
        const winner = event.score_home > event.score_away ? event.team_home : 
                       event.score_away > event.score_home ? event.team_away : 'Draw'
        notificationText = winner === 'Draw' 
          ? `🏁 Full time: ${event.team_home} ${event.score_home} - ${event.score_away} ${event.team_away}. They shared the points!`
          : `🏁 Full time: ${event.team_home} ${event.score_home} - ${event.score_away} ${event.team_away}. ${winner} takes it!`
      }

      // Generate TTS
      try {
        const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: notificationText,
            voice: 'nova',
            speed: 1.0,
          }),
        })

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer()
          const fileName = `live-update-${event.match_id}-${Date.now()}.mp3`
          
          const { error: uploadError } = await supabase.storage
            .from('gist-audio')
            .upload(fileName, new Uint8Array(audioBuffer), {
              contentType: 'audio/mpeg',
              upsert: false,
            })

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('gist-audio')
              .getPublicUrl(fileName)

            // Store notification
            await supabase.from('gists').insert({
              topic: `Live: ${event.team_home} vs ${event.team_away}`,
              topic_category: 'Sports Banter',
              headline: notificationText,
              narration: notificationText,
              context: `Live match update for ${event.team_home} vs ${event.team_away}`,
              script: notificationText,
              audio_url: publicUrl,
              status: 'published',
              meta: {
                match_id: event.match_id,
                event_type: event.type,
                is_live_update: true,
              },
            })

            console.log(`✅ Live notification generated for ${event.type}`)
          }
        }
      } catch (err) {
        console.error('Error generating TTS:', err)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        events: events.length,
        message: `Processed ${events.length} live events`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in live-match-monitor:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})