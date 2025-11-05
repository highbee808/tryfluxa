import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fallback configuration for multiple data sources
const DATA_SOURCES = {
  soccer: [
    { name: 'API-Football', key: 'API_FOOTBALL_KEY', priority: 1 },
    { name: 'TheSportsDB', key: 'THESPORTSDB_API_KEY', priority: 2 },
  ],
  basketball: [
    { name: 'SportsData.io', key: 'SPORTSDATA_API_KEY', priority: 1 },
    { name: 'API-Basketball', key: 'API_BASKETBALL_KEY', priority: 2 },
  ],
}

interface MatchData {
  match_id: string
  league: string
  team_home: string
  team_away: string
  score_home: number | null
  score_away: number | null
  status: string
  match_date: string
  venue?: string | null
  round?: string | null
  referee?: string | null
}

// Validation helper
function validateMatchData(match: MatchData): boolean {
  return !!(
    match.match_id &&
    match.league &&
    match.team_home &&
    match.team_away &&
    match.status &&
    match.match_date
  )
}

// Store matches with validation
async function storeMatches(supabase: any, matches: MatchData[], source: string): Promise<number> {
  let stored = 0
  for (const match of matches) {
    if (!validateMatchData(match)) {
      console.warn(`Invalid match data from ${source}:`, match)
      continue
    }

    const { error } = await supabase
      .from('match_results')
      .upsert(match, { onConflict: 'match_id' })

    if (error) {
      console.error(`Error storing match from ${source}:`, error)
    } else {
      stored++
    }
  }
  return stored
}

// Fetch NBA data from SportsData.io
async function fetchNBAFromSportsData(apiKey: string): Promise<MatchData[]> {
  const matches: MatchData[] = []
  
  for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
    const date = new Date()
    date.setDate(date.getDate() + dayOffset)
    const dateStr = date.toISOString().split('T')[0]
    
    try {
      const response = await fetch(
        `https://api.sportsdata.io/v3/nba/scores/json/GamesByDate/${dateStr}`,
        { headers: { 'Ocp-Apim-Subscription-Key': apiKey } }
      )

      if (response.ok) {
        const games = await response.json()
        for (const game of games) {
          matches.push({
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
          })
        }
      }
    } catch (err) {
      console.error(`NBA fetch error for ${dateStr}:`, err)
    }
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return matches
}

// Fetch Soccer data from API-Football
async function fetchSoccerFromAPIFootball(apiKey: string): Promise<MatchData[]> {
  const matches: MatchData[] = []
  
  const leagues = [
    { id: 39, name: 'Premier League', season: 2024 },
    { id: 140, name: 'La Liga', season: 2024 },
    { id: 135, name: 'Serie A', season: 2024 },
    { id: 78, name: 'Bundesliga', season: 2024 },
    { id: 61, name: 'Ligue 1', season: 2024 },
    { id: 2, name: 'Champions League', season: 2024 },
    { id: 3, name: 'Europa League', season: 2024 },
  ]

  const today = new Date()
  const fromDate = new Date(today)
  fromDate.setDate(today.getDate() - 7)
  const toDate = new Date(today)
  toDate.setDate(today.getDate() + 14)

  for (const league of leagues) {
    try {
      const url = `https://v3.football.api-sports.io/fixtures?league=${league.id}&season=${league.season}&from=${fromDate.toISOString().split('T')[0]}&to=${toDate.toISOString().split('T')[0]}`
      
      const response = await fetch(url, {
        headers: { 'x-apisports-key': apiKey },
      })

      if (response.ok) {
        const data = await response.json()
        const fixtures = data.response || []
        
        for (const fixture of fixtures) {
          matches.push({
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
          })
        }
      }
    } catch (err) {
      console.error(`Soccer fetch error for ${league.name}:`, err)
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  return matches
}

// Fetch Soccer data from TheSportsDB (free fallback)
async function fetchSoccerFromTheSportsDB(): Promise<MatchData[]> {
  const matches: MatchData[] = []
  
  // Major teams to fetch - search by name
  const teams = [
    'Barcelona',
    'Real Madrid', 
    'Liverpool',
    'Manchester United',
    'Chelsea',
    'Arsenal',
    'AC Milan',
    'Inter Milan',
    'Bayern Munich',
    'Juventus',
  ]

  for (const teamName of teams) {
    try {
      // First, search for the team to get its ID
      const searchResponse = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`
      )

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        const team = searchData.teams?.[0]
        
        if (team && team.idTeam) {
          // Fetch NEXT 15 upcoming events for this team (future matches)
          const eventsResponse = await fetch(
            `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${team.idTeam}&limit=15`
          )

          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json()
            const events = eventsData.events || []
            
            for (const event of events) {
              if (event.strSport === 'Soccer') {
                // Parse the date to ensure it's a future match
                const eventDate = new Date(event.strTimestamp || event.dateEvent)
                const now = new Date()
                
                matches.push({
                  match_id: `thesportsdb-${event.idEvent}`,
                  league: event.strLeague || 'Soccer',
                  team_home: event.strHomeTeam,
                  team_away: event.strAwayTeam,
                  score_home: event.intHomeScore ? parseInt(event.intHomeScore) : null,
                  score_away: event.intAwayScore ? parseInt(event.intAwayScore) : null,
                  status: eventDate > now ? 'Scheduled' : (event.strStatus || 'NS'),
                  match_date: event.strTimestamp || event.dateEvent,
                  venue: event.strVenue || null,
                  round: event.intRound ? `Round ${event.intRound}` : null,
                  referee: null,
                })
              }
            }
          }

          // Also fetch LAST 5 completed matches
          const lastEventsResponse = await fetch(
            `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team.idTeam}&limit=5`
          )

          if (lastEventsResponse.ok) {
            const lastEventsData = await lastEventsResponse.json()
            const lastEvents = lastEventsData.results || []
            
            for (const event of lastEvents) {
              if (event.strSport === 'Soccer') {
                matches.push({
                  match_id: `thesportsdb-${event.idEvent}`,
                  league: event.strLeague || 'Soccer',
                  team_home: event.strHomeTeam,
                  team_away: event.strAwayTeam,
                  score_home: event.intHomeScore ? parseInt(event.intHomeScore) : null,
                  score_away: event.intAwayScore ? parseInt(event.intAwayScore) : null,
                  status: 'Match Finished',
                  match_date: event.strTimestamp || event.dateEvent,
                  venue: event.strVenue || null,
                  round: event.intRound ? `Round ${event.intRound}` : null,
                  referee: null,
                })
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`TheSportsDB fetch error for team ${teamName}:`, err)
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return matches
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('⚽🏀 Fetching sports results with fallback system...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let totalMatches = 0
    const errors: string[] = []
    const sources: string[] = []

    // FETCH NBA DATA with fallback
    const sportsDataApiKey = Deno.env.get('SPORTSDATA_API_KEY')
    if (sportsDataApiKey) {
      console.log('🏀 Fetching NBA data from SportsData.io...')
      try {
        const nbaMatches = await fetchNBAFromSportsData(sportsDataApiKey)
        if (nbaMatches.length > 0) {
          const stored = await storeMatches(supabase, nbaMatches, 'SportsData.io')
          totalMatches += stored
          sources.push(`SportsData.io: ${stored} NBA games`)
          console.log(`✅ Stored ${stored} NBA games from SportsData.io`)
        } else {
          console.warn('⚠️ No NBA data from SportsData.io')
          errors.push('SportsData.io returned no NBA data')
        }
      } catch (error) {
        console.error('❌ SportsData.io NBA fetch failed:', error)
        errors.push(`SportsData.io: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      console.log('⚠️ No SportsData.io API key - skipping NBA')
    }

    // FETCH SOCCER DATA with fallback
    const footballApiKey = Deno.env.get('API_FOOTBALL_KEY')
    let soccerFetched = false

    // Primary: API-Football
    if (footballApiKey) {
      console.log('⚽ Fetching soccer data from API-Football...')
      try {
        const soccerMatches = await fetchSoccerFromAPIFootball(footballApiKey)
        if (soccerMatches.length > 0) {
          const stored = await storeMatches(supabase, soccerMatches, 'API-Football')
          totalMatches += stored
          sources.push(`API-Football: ${stored} soccer matches`)
          console.log(`✅ Stored ${stored} soccer matches from API-Football`)
          soccerFetched = true
        } else {
          console.warn('⚠️ No soccer data from API-Football')
          errors.push('API-Football returned no data')
        }
      } catch (error) {
        console.error('❌ API-Football fetch failed:', error)
        errors.push(`API-Football: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      console.log('⚠️ No API-Football key')
    }

    // Fallback: TheSportsDB (free API)
    if (!soccerFetched) {
      console.log('⚽ Falling back to TheSportsDB for soccer data...')
      try {
        const soccerMatches = await fetchSoccerFromTheSportsDB()
        if (soccerMatches.length > 0) {
          const stored = await storeMatches(supabase, soccerMatches, 'TheSportsDB')
          totalMatches += stored
          sources.push(`TheSportsDB (fallback): ${stored} soccer matches`)
          console.log(`✅ Stored ${stored} soccer matches from TheSportsDB (fallback)`)
          soccerFetched = true
        } else {
          console.warn('⚠️ No soccer data from TheSportsDB fallback')
          errors.push('TheSportsDB fallback returned no data')
        }
      } catch (error) {
        console.error('❌ TheSportsDB fallback failed:', error)
        errors.push(`TheSportsDB: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Log final results
    if (totalMatches === 0) {
      console.error('❌ CRITICAL: No matches fetched from any source!')
    }

    if (errors.length > 0) {
      console.warn('⚠️ Some requests failed:', errors)
    }

    console.log(`✅ Total matches stored: ${totalMatches}`)
    console.log(`📊 Sources used: ${sources.join(', ')}`)

    return new Response(
      JSON.stringify({ 
        success: totalMatches > 0, 
        matches: totalMatches,
        sources: sources,
        errors: errors.length > 0 ? errors : undefined,
        message: totalMatches > 0 
          ? `Sports results updated: ${totalMatches} matches from ${sources.length} source(s)`
          : 'Failed to fetch data from all sources'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: totalMatches > 0 ? 200 : 500,
      }
    )
  } catch (error) {
    console.error('❌ Critical error in fetch-sports-results:', error)
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
