import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('⚽ Fetching sports results...')
    
    const apiKey = Deno.env.get('SPORTSDATA_API_KEY')
    if (!apiKey) {
      throw new Error('SPORTSDATA_API_KEY not configured')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]
    
    // Fetch matches from Sportsdata.io
    const response = await fetch(
      `https://api.sportsdata.io/v4/soccer/scores/json/GamesByDate/${today}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        },
      }
    )

    if (!response.ok) {
      console.error('Sports API error:', response.status, await response.text())
      throw new Error(`Sports API returned ${response.status}`)
    }

    const matches = await response.json()
    console.log(`Fetched ${matches.length} matches`)

    // Top leagues to filter
    const topLeagues = [
      'Premier League',
      'La Liga',
      'Serie A',
      'Bundesliga',
      'Ligue 1',
    ]

    // Filter and store relevant matches
    const relevantMatches = matches.filter((match: any) => 
      topLeagues.includes(match.Competition?.Name)
    )

    console.log(`Found ${relevantMatches.length} relevant matches`)

    // Store in database
    for (const match of relevantMatches) {
      const { error } = await supabase
        .from('match_results')
        .upsert({
          match_id: match.GameId?.toString(),
          league: match.Competition?.Name,
          team_home: match.HomeTeamName,
          team_away: match.AwayTeamName,
          score_home: match.HomeTeamScore,
          score_away: match.AwayTeamScore,
          status: match.Status,
          match_date: match.DateTime,
        }, {
          onConflict: 'match_id'
        })

      if (error) {
        console.error('Error storing match:', error)
      }
    }

    console.log('✅ Sports results fetched and stored')

    return new Response(
      JSON.stringify({ 
        success: true, 
        matches: relevantMatches.length,
        message: 'Sports results updated'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in fetch-sports-results:', error)
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
