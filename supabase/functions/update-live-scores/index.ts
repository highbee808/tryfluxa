import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-signature',
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
    
    // Get all users who follow this team (favorite or rival)
    const { data: userTeams, error: userError } = await supabase
      .from('user_teams')
      .select('user_id, favorite_teams, rival_teams')
    
    if (userError) {
      console.error('Error fetching user teams:', userError)
      continue
    }
    
    console.log(`Found ${userTeams?.length || 0} user team records`)
    
    for (const userTeam of userTeams || []) {
      const isFavorite = userTeam.favorite_teams?.includes(team)
      const isRival = userTeam.rival_teams?.includes(team)
      
      if (isFavorite || isRival) {
        const homeScore = change.is_home ? change.new_score : (matchInfo.team_home === team ? change.old_score : change.new_score)
        const awayScore = !change.is_home ? change.new_score : (matchInfo.team_away === team ? change.old_score : change.new_score)
        const scoreText = `${matchInfo.team_home} ${homeScore ?? 0} - ${awayScore ?? 0} ${matchInfo.team_away}`
        
        const message = isFavorite
          ? `🎯 ${team} just scored! ${scoreText}`
          : `⚠️ Rival team ${team} scored against ${opponent}! ${scoreText}`
        
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: userTeam.user_id,
            type: 'score_change',
            title: isFavorite ? '⚽ Your Team Scored!' : '🚨 Rival Team Update',
            message,
            entity_name: team
          })
        
        if (notifError) {
          console.error('Error creating notification:', notifError)
        } else {
          console.log(`Notification sent to user ${userTeam.user_id} for ${team}`)
        }
      }
    }
  }
}

async function validateCronSignature(req: Request): Promise<boolean> {
  const signature = req.headers.get('x-cron-signature')
  
  // If no signature header, allow the call (manual trigger from frontend)
  if (!signature) {
    console.log('No cron signature - allowing manual trigger')
    return true
  }
  
  // If signature is present, validate it
  const cronSecret = Deno.env.get('CRON_SECRET')
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Validate HMAC signature for CRON jobs
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

