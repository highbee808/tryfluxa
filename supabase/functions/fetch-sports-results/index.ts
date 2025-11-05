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
    console.log('⚽🏀 Fetching sports results...')
    
    const sportsDataApiKey = Deno.env.get('SPORTSDATA_API_KEY')
    const footballApiKey = Deno.env.get('API_FOOTBALL_KEY')
    
    if (!sportsDataApiKey && !footballApiKey) {
      throw new Error('No API keys configured')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let totalMatches = 0
    const errors = []

    // FETCH NBA DATA (SportsData.io)
    if (sportsDataApiKey) {
      console.log('🏀 Fetching NBA data...')
      try {
        // Fetch NBA games from past 7 days and next 7 days
        for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
          const date = new Date()
          date.setDate(date.getDate() + dayOffset)
          const dateStr = date.toISOString().split('T')[0]
          
          try {
            const response = await fetch(
              `https://api.sportsdata.io/v3/nba/scores/json/GamesByDate/${dateStr}`,
              {
                headers: {
                  'Ocp-Apim-Subscription-Key': sportsDataApiKey,
                },
              }
            )

            if (response.ok) {
              const games = await response.json()
              
              for (const game of games) {
                const { error } = await supabase
                  .from('match_results')
                  .upsert({
                    match_id: `nba-${game.GameID}`,
                    league: 'NBA',
                    team_home: game.HomeTeam,
                    team_away: game.AwayTeam,
                    score_home: game.HomeTeamScore,
                    score_away: game.AwayTeamScore,
                    status: game.Status,
                    match_date: game.DateTime,
                    venue: game.StadiumID ? `Arena ${game.StadiumID}` : null,
                    round: `${game.Season} - ${game.SeasonType}`,
                    referee: null,
                  }, {
                    onConflict: 'match_id'
                  })

                if (error) {
                  console.error('Error storing NBA match:', error)
                }
              }
              
              totalMatches += games.length
              console.log(`✅ Stored ${games.length} NBA games for ${dateStr}`)
            }
          } catch (err) {
            errors.push(`NBA ${dateStr}: ${err instanceof Error ? err.message : 'Unknown error'}`)
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error('NBA fetch error:', error)
        errors.push(`NBA: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // FETCH SOCCER DATA (API-Football)
    if (footballApiKey) {
      console.log('⚽ Fetching soccer data...')
      try {
        // Get major leagues with correct season (2024 for 2024-25 season)
        const leagues = [
          { id: 39, name: 'Premier League', season: 2024 },      // England
          { id: 140, name: 'La Liga', season: 2024 },            // Spain
          { id: 135, name: 'Serie A', season: 2024 },            // Italy
          { id: 78, name: 'Bundesliga', season: 2024 },          // Germany
          { id: 61, name: 'Ligue 1', season: 2024 },             // France
          { id: 2, name: 'Champions League', season: 2024 },     // UEFA
          { id: 3, name: 'Europa League', season: 2024 },        // UEFA
        ]

        const today = new Date()
        const fromDate = new Date(today)
        fromDate.setDate(today.getDate() - 7)  // Expanded to 7 days back
        const toDate = new Date(today)
        toDate.setDate(today.getDate() + 14)   // Expanded to 14 days forward

        for (const league of leagues) {
          try {
            const url = `https://v3.football.api-sports.io/fixtures?league=${league.id}&season=${league.season}&from=${fromDate.toISOString().split('T')[0]}&to=${toDate.toISOString().split('T')[0]}`
            console.log(`Fetching ${league.name}: ${url}`)
            
            const response = await fetch(url, {
              headers: {
                'x-apisports-key': footballApiKey,
              },
            })

            if (response.ok) {
              const data = await response.json()
              const fixtures = data.response || []
              
              for (const fixture of fixtures) {
                const { error } = await supabase
                  .from('match_results')
                  .upsert({
                    match_id: `football-${fixture.fixture.id}`,
                    league: league.name,
                    team_home: fixture.teams.home.name,
                    team_away: fixture.teams.away.name,
                    score_home: fixture.goals.home,
                    score_away: fixture.goals.away,
                    status: fixture.fixture.status.short,
                    match_date: fixture.fixture.date,
                    venue: fixture.fixture.venue?.name || null,
                    round: fixture.league.round || null,
                    referee: fixture.fixture.referee || null,
                  }, {
                    onConflict: 'match_id'
                  })

                if (error) {
                  console.error('Error storing soccer match:', error)
                }
              }
              
              totalMatches += fixtures.length
              console.log(`✅ Stored ${fixtures.length} ${league.name} fixtures`)
            } else {
              const errorText = await response.text()
              console.error(`Failed to fetch ${league.name}:`, response.status, errorText)
              errors.push(`${league.name}: ${response.status}`)
            }
          } catch (err) {
            errors.push(`${league.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
          }
          
          // Rate limiting - API-Football free tier has limits
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error('Soccer fetch error:', error)
        errors.push(`Soccer: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (errors.length > 0) {
      console.warn('Some requests failed:', errors)
    }

    console.log(`✅ Total matches stored: ${totalMatches}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        matches: totalMatches,
        errors: errors.length > 0 ? errors : undefined,
        message: `Sports results updated: ${totalMatches} matches`
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
