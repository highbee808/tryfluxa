import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface ScoreChange {
  match_id: string;
  team: string;
  old_score: number | null;
  new_score: number | null;
  is_home: boolean;
}

async function notifyUsersOfScoreChange(
  supabase: any,
  scoreChanges: ScoreChange[],
  matchInfo: { team_home: string; team_away: string; league: string }
) {
  console.log('Checking for users to notify about score changes:', scoreChanges)
  
  for (const change of scoreChanges) {
    const team = change.is_home ? matchInfo.team_home : matchInfo.team_away
    const opponent = change.is_home ? matchInfo.team_away : matchInfo.team_home
    
    // Get all users who follow this team (favorite or rival) from auth.users
    // Read from user_metadata (stored in users table)
    const { data: users, error: adminError } = await supabase.auth.admin.listUsers()
    
    if (adminError) {
      console.error('Error fetching users:', adminError)
      continue
    }
    
    // Filter users who have this team in favorites or rivals
    for (const user of users?.users || []) {
      const favoriteTeams = (user.user_metadata?.favorite_teams || []) as string[]
      const rivalTeams = (user.user_metadata?.rival_teams || []) as string[]
      const isFavorite = favoriteTeams.includes(team)
      const isRival = rivalTeams.includes(team)
      
      if (!isFavorite && !isRival) continue
        const homeScore = change.is_home ? change.new_score : (matchInfo.team_home === team ? change.old_score : change.new_score)
        const awayScore = !change.is_home ? change.new_score : (matchInfo.team_away === team ? change.old_score : change.new_score)
        const scoreText = `${matchInfo.team_home} ${homeScore ?? 0} - ${awayScore ?? 0} ${matchInfo.team_away}`
        
        const message = isFavorite
          ? `🎯 ${team} just scored! ${scoreText}`
          : `⚠️ Rival team ${team} scored against ${opponent}! ${scoreText}`
        
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'score_change',
            title: isFavorite ? '⚽ Your Team Scored!' : '🚨 Rival Team Update',
            message,
            entity_name: team
          })
        
        if (notifError) {
          console.error('Error creating notification:', notifError)
        } else {
          console.log(`Notification sent to user ${user.id} for ${team}`)
        }
      }
    }
  }
}

// Function to notify users about match events (start, half-time, etc.)
async function sendMatchNotification(
  supabase: any,
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  league: string,
  eventType: 'match_start' | 'half_time' | 'full_time'
) {
  console.log(`Sending ${eventType} notification for ${homeTeam} vs ${awayTeam}`)
  
  // Get users following either team
  const { data: entities } = await supabase
    .from('fan_entities')
    .select('id, name')
    .or(`name.eq.${homeTeam},name.eq.${awayTeam}`)
    .eq('category', 'sports')
  
  if (!entities || entities.length === 0) {
    console.log('No entities found for teams')
    return
  }
  
  const entityIds = entities.map((e: any) => e.id)
  
  // Get followers of these teams
  const { data: followers } = await supabase
    .from('fan_follows')
    .select('user_id')
    .in('entity_id', entityIds)
  
  if (!followers || followers.length === 0) {
    console.log('No followers found')
    return
  }
  
  const eventMessages = {
    match_start: `⚽ ${homeTeam} vs ${awayTeam} is starting now in ${league}!`,
    half_time: `⏸️ Half time: ${homeTeam} vs ${awayTeam} - Check the latest scores!`,
    full_time: `⏱️ Full time! ${homeTeam} vs ${awayTeam} has ended. See the final result!`
  }
  
  const eventTitles = {
    match_start: '⚽ Match Starting!',
    half_time: '⏸️ Half Time',
    full_time: '⏱️ Full Time'
  }
  
  // Create notifications for each follower
  const notifications = followers.map((f: any) => ({
    user_id: f.user_id,
    type: 'match_event',
    title: eventTitles[eventType],
    message: eventMessages[eventType],
    entity_name: `${homeTeam} vs ${awayTeam}`,
    is_read: false
  }))
  
  const { error } = await supabase
    .from('notifications')
    .insert(notifications)
    
  if (error) {
    console.error('Error sending match notifications:', error)
  } else {
    console.log(`✉️ Sent ${eventType} notifications to ${followers.length} users`)
  }
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
  // Soccer teams - use full team names as they appear in API
  'Manchester United': 'Manchester United',
  'Liverpool': 'Liverpool',
  'Chelsea': 'Chelsea',
  'Arsenal': 'Arsenal',
  'Barcelona': 'Barcelona',
  'Real Madrid': 'Real Madrid',
  'AC Milan': 'AC Milan',
  'Inter Milan': 'Inter',
  'Bayern Munich': 'Bayern Munich',
  'Borussia Dortmund': 'Borussia Dortmund',
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders })
  }

  // This function can be called by:
  // 1. Authenticated users with JWT (for manual triggers)
  // 2. Supabase cron jobs (managed by Supabase, no auth needed)
  // No additional validation needed as Supabase handles cron security

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

        // Find live match - support multiple status variations
        const liveMatch = validMatches.find(m => 
          m.status === 'InProgress' || m.status === 'Halftime' || m.status === 'LIVE' || 
          m.status === '1H' || m.status === '2H' || m.status === 'HT' || m.status === 'In Play'
        )
        
        // Detect if match just started (became live)
        const wasNotLive = !entity.current_match || entity.current_match.status !== 'live'
        const isNowLive = !!liveMatch
        
        if (isNowLive && wasNotLive && liveMatch) {
          // Match just went live - send notifications
          try {
            await sendMatchNotification(
              supabase,
              liveMatch.match_id,
              liveMatch.team_home,
              liveMatch.team_away,
              liveMatch.league,
              'match_start'
            )
          } catch (notifError) {
            console.error('Failed to send match start notification:', notifError)
          }
        }

        // Detect score changes for live matches
        const scoreChanges: ScoreChange[] = []
        if (liveMatch && entity.current_match) {
          const oldHomeScore = entity.current_match.home_score
          const oldAwayScore = entity.current_match.away_score
          const newHomeScore = liveMatch.score_home
          const newAwayScore = liveMatch.score_away
          
          if (oldHomeScore !== newHomeScore) {
            scoreChanges.push({
              match_id: liveMatch.match_id,
              team: liveMatch.team_home,
              old_score: oldHomeScore,
              new_score: newHomeScore,
              is_home: true
            })
          }
          
          if (oldAwayScore !== newAwayScore) {
            scoreChanges.push({
              match_id: liveMatch.match_id,
              team: liveMatch.team_away,
              old_score: oldAwayScore,
              new_score: newAwayScore,
              is_home: false
            })
          }
          
        // Send notifications if there are score changes
        if (scoreChanges.length > 0) {
          await notifyUsersOfScoreChange(supabase, scoreChanges, {
            team_home: liveMatch.team_home,
            team_away: liveMatch.team_away,
            league: liveMatch.league
          })
          
          // Generate live commentary for goals
          try {
            await supabase.functions.invoke('generate-live-commentary', {
              body: {
                matchId: liveMatch.match_id,
                homeTeam: liveMatch.team_home,
                awayTeam: liveMatch.team_away,
                homeScore: liveMatch.score_home,
                awayScore: liveMatch.score_away,
                league: liveMatch.league,
                eventType: 'goal'
              }
            })
          } catch (commentaryError) {
            console.error('Failed to generate commentary:', commentaryError)
          }
        }
        }

        // Find completed matches - support multiple status variations
        const completedMatches = validMatches.filter(m => 
          m.status === 'FullTime' || m.status === 'Finished' || m.status === 'Match Finished' || 
          m.status === 'Final' || m.status === 'FT' || m.status === 'Closed' || m.status === 'AOT' || m.status === 'AET'
        ).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())

        // Find scheduled matches - support multiple status variations
        const scheduledMatches = validMatches.filter(m => 
          m.status === 'Scheduled' || m.status === 'Not Started' || m.status === 'NS' || 
          m.status === 'TBD' || m.status === 'Upcoming' || 
          (!m.score_home && !m.score_away && m.status !== 'Final' && m.status !== 'Match Finished')
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
              team_code: teamCode || entity.stats?.team_code,
              total_matches: validMatches.length,
              live_matches: liveMatch ? 1 : 0,
              last_data_update: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', entity.id)

        if (!updateError) {
          updatedCount++
          if (currentMatch) {
            console.log(`🔴 LIVE: ${entity.name} ${currentMatch.home_score}-${currentMatch.away_score} ${currentMatch.away_team}`)
            if (scoreChanges.length > 0) {
              console.log(`📢 Score changes detected: ${scoreChanges.length} notifications sent`)
            }
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

