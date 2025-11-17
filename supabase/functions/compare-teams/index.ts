import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { team1, team2, userId } = await req.json()

    if (!team1 || !team2) {
      throw new Error('Both team names are required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch recent matches for both teams
    const { data: team1Matches } = await supabase
      .from('match_results')
      .select('*')
      .or(`team_home.eq.${team1},team_away.eq.${team1}`)
      .order('match_date', { ascending: false })
      .limit(10)

    const { data: team2Matches } = await supabase
      .from('match_results')
      .select('*')
      .or(`team_home.eq.${team2},team_away.eq.${team2}`)
      .order('match_date', { ascending: false })
      .limit(10)

    // Calculate stats
    const calculateStats = (matches: any[], teamName: string) => {
      let wins = 0, losses = 0, draws = 0, goalsFor = 0, goalsAgainst = 0
      const form: string[] = []

      matches?.forEach(match => {
        const isHome = match.team_home === teamName
        const teamScore = isHome ? match.score_home : match.score_away
        const opponentScore = isHome ? match.score_away : match.score_home

        goalsFor += teamScore || 0
        goalsAgainst += opponentScore || 0

        if (teamScore > opponentScore) {
          wins++
          form.push('W')
        } else if (teamScore < opponentScore) {
          losses++
          form.push('L')
        } else {
          draws++
          form.push('D')
        }
      })

      return { name: teamName, wins, losses, draws, goalsFor, goalsAgainst, form: form.slice(0, 5) }
    }

    const team1Stats = calculateStats(team1Matches || [], team1)
    const team2Stats = calculateStats(team2Matches || [], team2)

    // Get head-to-head matches
    const { data: h2hMatches } = await supabase
      .from('match_results')
      .select('*')
      .or(`team_home.eq.${team1},team_away.eq.${team1}`)
      .or(`team_home.eq.${team2},team_away.eq.${team2}`)
      .order('match_date', { ascending: false })
      .limit(5)

    const h2h = h2hMatches?.filter(m => 
      (m.team_home === team1 && m.team_away === team2) ||
      (m.team_home === team2 && m.team_away === team1)
    ) || []

    // Use Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    const aiPrompt = `You are Fluxa, a witty sports analyst. Compare these two teams:

**${team1}**
Recent Form: ${team1Stats.form.join(' ')}
Record: ${team1Stats.wins}W-${team1Stats.draws}D-${team1Stats.losses}L
Goals: ${team1Stats.goalsFor} scored, ${team1Stats.goalsAgainst} conceded

**${team2}**
Recent Form: ${team2Stats.form.join(' ')}
Record: ${team2Stats.wins}W-${team2Stats.draws}D-${team2Stats.losses}L
Goals: ${team2Stats.goalsFor} scored, ${team2Stats.goalsAgainst} conceded

**Head-to-Head:**
${h2h.length > 0 ? h2h.map(m => `${m.team_home} ${m.score_home}-${m.score_away} ${m.team_away}`).join(', ') : 'No recent meetings'}

Provide a sassy, insightful comparison (200-300 words) covering:
- Which team has the edge and why
- Key strengths/weaknesses
- Historical context
- Prediction for next matchup`

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are Fluxa, a charismatic AI sports analyst with a Gen-Z vibe.' },
          { role: 'user', content: aiPrompt }
        ],
        temperature: 0.8,
      }),
    })

    if (!aiResponse.ok) {
      throw new Error('AI analysis failed')
    }

    const aiData = await aiResponse.json()
    const analysis = aiData.choices[0]?.message?.content || 'Analysis unavailable'

    // Log API usage
    const inputTokens = Math.ceil(aiPrompt.length / 4)
    const outputTokens = Math.ceil((analysis?.length || 0) / 4)
    const totalTokens = inputTokens + outputTokens
    const estimatedCost = (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30
    
    await supabase.from("api_usage_logs").insert({
      provider: "lovable_ai",
      endpoint: "gemini-2.5-flash",
      tokens_used: totalTokens,
      estimated_cost: estimatedCost,
      user_id: userId
    })

    const headToHead = h2h.length > 0
      ? `Last ${h2h.length} meetings: ${h2h.map(m => `${m.team_home} ${m.score_home}-${m.score_away} ${m.team_away}`).join(', ')}`
      : 'No recent head-to-head matches found'

    return new Response(
      JSON.stringify({
        team1Stats,
        team2Stats,
        analysis,
        headToHead
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error comparing teams:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})