import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('🔄 Starting comprehensive sports data sync...')
    
    const apiKey = Deno.env.get('SPORTSDATA_API_KEY')
    if (!apiKey) {
      throw new Error('SPORTSDATA_API_KEY not configured')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Football/Soccer leagues to fetch
    const soccerLeagues = [
      { name: 'Premier League', apiId: 'EPL' },
      { name: 'La Liga', apiId: 'LALIGA' },
      { name: 'Serie A', apiId: 'SERIEA' },
      { name: 'Bundesliga', apiId: 'BUNDESLIGA' },
      { name: 'Ligue 1', apiId: 'LIGUE1' },
      { name: 'UEFA Champions League', apiId: 'UCL' },
    ]

    let totalMatches = 0
    const errors = []

    // Fetch soccer matches for past 7 days and next 14 days
    console.log('⚽ Fetching football/soccer data...')
    for (let dayOffset = -7; dayOffset <= 14; dayOffset++) {
      const date = new Date()
      date.setDate(date.getDate() + dayOffset)
      const dateStr = date.toISOString().split('T')[0]
      
      try {
        const response = await fetch(
          `https://api.sportsdata.io/v4/soccer/scores/json/GamesByDate/${dateStr}`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': apiKey,
            },
          }
        )

        if (response.ok) {
          const matches = await response.json()
          
          // Filter for top leagues only
          const topLeagueMatches = matches.filter((match: any) => 
            soccerLeagues.some(league => 
              match.Competition?.Name?.includes(league.name) ||
              match.Competition?.CompetitionId === league.apiId
            )
          )

          // Store matches
          for (const match of topLeagueMatches) {
            await supabase.from('match_results').upsert({
              match_id: `soccer-${match.GameId}`,
              league: match.Competition?.Name || 'Unknown League',
              team_home: match.HomeTeamName,
              team_away: match.AwayTeamName,
              score_home: match.HomeTeamScore,
              score_away: match.AwayTeamScore,
              status: match.Status || 'Scheduled',
              match_date: match.DateTime,
            }, {
              onConflict: 'match_id'
            })
          }

          totalMatches += topLeagueMatches.length
          console.log(`✅ ${dateStr}: ${topLeagueMatches.length} soccer matches`)
        }
      } catch (err) {
        errors.push(`Soccer ${dateStr}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Fetch NBA basketball data
    console.log('🏀 Fetching NBA basketball data...')
    for (let dayOffset = -7; dayOffset <= 14; dayOffset++) {
      const date = new Date()
      date.setDate(date.getDate() + dayOffset)
      const dateStr = date.toISOString().split('T')[0]
      
      try {
        const response = await fetch(
          `https://api.sportsdata.io/v3/nba/scores/json/GamesByDate/${dateStr}`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': apiKey,
            },
          }
        )

        if (response.ok) {
          const games = await response.json()
          
          // Store NBA games
          for (const game of games) {
            await supabase.from('match_results').upsert({
              match_id: `nba-${game.GameID}`,
              league: 'NBA',
              team_home: game.HomeTeam,
              team_away: game.AwayTeam,
              score_home: game.HomeTeamScore,
              score_away: game.AwayTeamScore,
              status: game.Status || 'Scheduled',
              match_date: game.DateTime,
            }, {
              onConflict: 'match_id'
            })
          }

          totalMatches += games.length
          console.log(`✅ ${dateStr}: ${games.length} NBA games`)
        }
      } catch (err) {
        errors.push(`NBA ${dateStr}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    if (errors.length > 0) {
      console.warn('⚠️ Some requests failed:', errors.slice(0, 5))
    }

    console.log(`✅ Sync complete! Total matches stored: ${totalMatches}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalMatches,
        errors: errors.length,
        message: `Synced ${totalMatches} matches with ${errors.length} errors`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Error in sync-sports-data:', error)
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
