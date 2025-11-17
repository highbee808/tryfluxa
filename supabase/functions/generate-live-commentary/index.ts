import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const matchEventSchema = z.object({
  matchId: z.string().min(1).max(100),
  homeTeam: z.string().min(1).max(100),
  awayTeam: z.string().min(1).max(100),
  homeScore: z.number().int().min(0).max(50),
  awayScore: z.number().int().min(0).max(50),
  league: z.string().min(1).max(100),
  eventType: z.enum(['goal', 'half_time', 'full_time', 'match_start', 'close_call'])
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse and validate input
    const body = await req.json()
    const validatedData = matchEventSchema.parse(body)
    const { matchId, homeTeam, awayTeam, homeScore, awayScore, league, eventType } = validatedData
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    // Generate personality-driven commentary
    const systemPrompt = `You are Fluxa, a witty and charismatic sports commentator with a Gen-Z vibe. 
Your commentary is:
- Energetic and engaging, using modern slang naturally
- Insightful about tactics and player performance
- Dramatic during key moments (goals, close calls)
- Playfully biased towards exciting plays
- Concise (2-3 sentences max)
- Uses emojis sparingly but effectively

Event types: goal, half_time, full_time, match_start, close_call`

    const eventContext = {
      goal: `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} - Someone just scored! Create hype commentary about this goal.`,
      half_time: `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} at half time. Analyze the first half.`,
      full_time: `Final score: ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}. Wrap up the match.`,
      match_start: `${homeTeam} vs ${awayTeam} is about to kick off in ${league}! Build anticipation.`,
      close_call: `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} - A close chance! Create tension.`
    }

    const prompt = eventContext[eventType as keyof typeof eventContext] || 
                   `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} - Live update from ${league}`

    console.log('Generating commentary for:', prompt)

    // Generate commentary using Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 150,
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('AI API error:', aiResponse.status, errorText)
      throw new Error(`AI generation failed: ${errorText}`)
    }

    const aiData = await aiResponse.json()
    const commentary = aiData.choices[0]?.message?.content || 'The match continues...'

    console.log('Generated commentary:', commentary)

    // Generate audio using TTS
    const { data: ttsData, error: ttsError } = await supabase.functions.invoke('text-to-speech', {
      body: { text: commentary }
    })

    if (ttsError) {
      console.error('TTS error:', ttsError)
      throw ttsError
    }

    // Store as gist
    const { data: gist, error: gistError } = await supabase
      .from('gists')
      .insert({
        topic: `${homeTeam} vs ${awayTeam}`,
        topic_category: 'Sports Banter',
        headline: `${homeScore}-${awayScore}: ${eventType === 'goal' ? '⚽ GOAL!' : 'Live Update'}`,
        narration: commentary,
        script: commentary,
        audio_url: ttsData.audioUrl,
        context: `${league} - ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`,
        status: 'published',
        meta: {
          match_id: matchId,
          event_type: eventType,
          is_live_update: true,
          home_team: homeTeam,
          away_team: awayTeam,
          home_score: homeScore,
          away_score: awayScore,
        }
      })
      .select()
      .single()

    if (gistError) throw gistError

    return new Response(
      JSON.stringify({ 
        success: true, 
        commentary,
        audioUrl: ttsData.audioUrl,
        gistId: gist.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating commentary:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
