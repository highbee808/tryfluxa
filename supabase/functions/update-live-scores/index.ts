import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Team code mapping: Full names -> API abbreviations
const TEAM_CODE_MAP: Record<string, string> = {
  // NBA Teams
  'Dallas Mavericks': 'DAL',
  'Phoenix Suns': 'PHO',
  'Philadelphia 76ers': 'PHI',
  'Milwaukee Bucks': 'MIL',
  'Los Angeles Lakers': 'LAL',
  'Boston Celtics': 'BOS',
  'Golden State Warriors': 'GS',
  'Miami Heat': 'MIA',
  'Brooklyn Nets': 'BKN',
  'Denver Nuggets': 'DEN',
  'Memphis Grizzlies': 'MEM',
  'Cleveland Cavaliers': 'CLE',
  'New York Knicks': 'NYK',
  'Sacramento Kings': 'SAC',
  'LA Clippers': 'LAC',
  'Minnesota Timberwolves': 'MIN',
  'Oklahoma City Thunder': 'OKC',
  'New Orleans Pelicans': 'NO',
  'Indiana Pacers': 'IND',
  'Atlanta Hawks': 'ATL',
  'Chicago Bulls': 'CHI',
  'Toronto Raptors': 'TOR',
  'Houston Rockets': 'HOU',
  'Utah Jazz': 'UTA',
  'San Antonio Spurs': 'SA',
  'Portland Trail Blazers': 'POR',
  'Orlando Magic': 'ORL',
  'Washington Wizards': 'WAS',
  'Charlotte Hornets': 'CHA',
  'Detroit Pistons': 'DET',
  // Soccer teams (if needed)
  'Manchester United': 'MUN',
  'Liverpool': 'LIV',
  'Chelsea': 'CHE',
  'Arsenal': 'ARS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔴 Starting live score update...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const sportsApiKey = Deno.env.get('SPORTSDATA_API_KEY')
    
    if (!sportsApiKey) {
      throw new Error('SPORTSDATA_API_KEY not configured')
    }

    // Fetch sports entities grouped by sport type
    const { data: entities, error: entitiesError } = await supabase
      .from('fan_entities')
      .select('*')
      .eq('category', 'sports')
      .limit(50)

    if (entitiesError) throw entitiesError

    console.log(`📊 Processing ${entities?.length} sports entities`)

    let updatedCount = 0

    for (const entity of entities || []) {
      try {
        const sport = entity.stats?.sport || 'football'
        const league = entity.stats?.league || ''
        
        // Use team code mapping to match API data
        const searchName = TEAM_CODE_MAP[entity.name] || entity.name
        const teamCode = TEAM_CODE_MAP[entity.name]
        
        console.log(`🔍 Searching for ${entity.name} using code: ${searchName}`)
        
        // Fetch real match data from match_results table (populated by fetch-sports-results)
        const { data: matchResults } = await supabase
          .from('match_results')
          .select('*')
          .or(`team_home.ilike.%${searchName}%,team_away.ilike.%${searchName}%`)
          .order('match_date', { ascending: true })
          .limit(10)

        console.log(`📋 Found ${matchResults?.length || 0} matches for ${entity.name}`)
        
        if (matchResults?.length === 0 && !teamCode) {
          console.warn(`⚠️ No matches found for ${entity.name} - possible name mismatch (no team code mapping)`)
        }

        // Filter matches to ensure they're from the correct sport/league
        const validMatches = matchResults?.filter(match => {
          const matchLeague = match.league || ''
          // Validate league matches entity's league
          if (league && !matchLeague.toLowerCase().includes(league.toLowerCase())) {
            return false
          }
          
          // Additional validation: ensure both teams exist and match is valid
          if (!match.team_home || !match.team_away) return false
          
          // Check if entity name appears in either team
          const entityNameLower = entity.name.toLowerCase()
          const homeTeamLower = match.team_home.toLowerCase()
          const awayTeamLower = match.team_away.toLowerCase()
          
          return homeTeamLower.includes(entityNameLower) || awayTeamLower.includes(entityNameLower)
        }) || []

        // Find live match
        const liveMatch = validMatches.find(m => 
          m.status === 'InProgress' || m.status === 'Halftime'
        )

        // Find completed matches
        const completedMatches = validMatches.filter(m => 
          m.status === 'FullTime' || m.status === 'Finished'
        ).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())

        // Find scheduled matches
        const scheduledMatches = validMatches.filter(m => 
          m.status === 'Scheduled' || m.status === 'Not Started'
        ).sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

        const currentMatch = liveMatch ? {
          status: 'live',
          league: liveMatch.league,
          home_team: liveMatch.team_home,
          away_team: liveMatch.team_away,
          home_score: liveMatch.score_home || 0,
          away_score: liveMatch.score_away || 0,
          match_time: "LIVE",
          commentary: generateCommentary(
            entity.name, 
            liveMatch.score_home || 0, 
            liveMatch.score_away || 0
          ),
          match_id: liveMatch.match_id
        } : null

        const lastMatch = completedMatches[0] ? {
          home_team: completedMatches[0].team_home,
          away_team: completedMatches[0].team_away,
          home_score: completedMatches[0].score_home,
          away_score: completedMatches[0].score_away,
          league: completedMatches[0].league,
          date: new Date(completedMatches[0].match_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })
        } : null

        const nextMatch = scheduledMatches[0] ? {
          home_team: scheduledMatches[0].team_home,
          away_team: scheduledMatches[0].team_away,
          league: scheduledMatches[0].league,
          date: new Date(scheduledMatches[0].match_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          venue: entity.stats?.stadium || 'Stadium'
        } : null

        const upcomingEvents = scheduledMatches.slice(0, 3).map(match => ({
          title: `${match.team_home} vs ${match.team_away}`,
          date: new Date(match.match_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          venue: match.team_home === entity.name 
            ? (entity.stats?.stadium || 'Home Stadium')
            : 'Away Stadium'
        }))

        // Update entity with new match data and store team code
        const { error: updateError } = await supabase
          .from('fan_entities')
          .update({
            current_match: currentMatch,
            next_match: nextMatch,
            last_match: lastMatch,
            upcoming_events: upcomingEvents,
            stats: {
              ...entity.stats,
              team_code: teamCode || entity.stats?.team_code
            }
          })
          .eq('id', entity.id)

        if (!updateError) {
          updatedCount++
          if (currentMatch) {
            console.log(`🔴 LIVE: ${entity.name} ${currentMatch.home_score}-${currentMatch.away_score} ${currentMatch.away_team}`)
            
            // Send push notifications for live matches
            await sendMatchNotification(supabase, entity.id, currentMatch)
          }
        }
      } catch (err) {
        console.error(`Error updating ${entity.name}:`, err)
      }
    }

    console.log(`✅ Updated ${updatedCount} entities with live data`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updatedCount,
        message: `Live scores updated for ${updatedCount} entities`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Error updating live scores:', error)
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

// Helper functions

async function sendMatchNotification(supabase: any, entityId: string, match: any) {
  try {
    // Get all users following this entity
    const { data: followers } = await supabase
      .from('fan_follows')
      .select('user_id')
      .eq('entity_id', entityId)

    if (!followers || followers.length === 0) return

    // Store notification data for web push (to be sent by frontend)
    const notifications = followers.map((follower: any) => ({
      user_id: follower.user_id,
      entity_id: entityId,
      type: 'live_match',
      title: `🔴 LIVE: ${match.home_team} vs ${match.away_team}`,
      message: `${match.home_score}-${match.away_score} • ${match.match_time}`,
      data: { match_id: match.match_id }
    }))

    console.log(`📲 Prepared ${notifications.length} notifications for live match`)
  } catch (err) {
    console.error('Error sending notifications:', err)
  }
}

function generateCommentary(team: string, homeScore: number, awayScore: number): string {
  const commentaries = [
    `${team} looking dangerous on the attack!`,
    `Great save! The defense holds strong.`,
    `Amazing skill on display from ${team}!`,
    `The crowd is going wild! What an atmosphere!`,
    `Close call! Just wide of the post.`,
    `${team} pressing high and winning the ball back.`,
    `Brilliant teamwork leading to another chance!`,
    `The intensity is incredible out there!`
  ]
  
  if (homeScore > awayScore + 1) {
    return `${team} dominating with a commanding lead!`
  } else if (awayScore > homeScore + 1) {
    return `${team} fighting back, trying to turn this around!`
  }
  
  return commentaries[Math.floor(Math.random() * commentaries.length)]
}

