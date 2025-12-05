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
    console.log('🔍 Starting data consistency monitor...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const apiKey = Deno.env.get('SPORTSDATA_API_KEY')
    if (!apiKey) {
      throw new Error('SPORTSDATA_API_KEY not configured')
    }

    let issuesFound = 0
    let issuesFixed = 0
    let errors = 0

    // Fetch all sports entities
    const { data: entities, error: entitiesError } = await supabase
      .from('fan_entities')
      .select('*')
      .eq('category', 'sports')

    if (entitiesError) throw entitiesError

    console.log(`📊 Checking consistency for ${entities?.length || 0} sports entities`)

    // Get current date for filtering recent/upcoming matches
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

    for (const entity of entities || []) {
      try {
        const sport = entity.stats?.sport || 'football'
        const league = entity.stats?.league || ''
        
        // Fetch actual match data from match_results
        const { data: actualMatches } = await supabase
          .from('match_results')
          .select('*')
          .or(`team_home.ilike.%${entity.name}%,team_away.ilike.%${entity.name}%`)
          .gte('match_date', twoDaysAgo.toISOString())
          .lte('match_date', twoDaysFromNow.toISOString())

        if (!actualMatches || actualMatches.length === 0) {
          // Log if no matches found
          await logIssue(supabase, {
            check_type: 'match_data_validation',
            entity_id: entity.id,
            entity_name: entity.name,
            issue_type: 'no_matches_found',
            issue_description: `No matches found in the past 2 days or next 2 days for ${entity.name}`,
            action_taken: 'cleared_match_fields',
            severity: 'info',
            auto_fixed: true,
            before_data: {
              current_match: entity.current_match,
              next_match: entity.next_match,
              last_match: entity.last_match
            }
          })

          // Clear match fields if no data available
          await supabase
            .from('fan_entities')
            .update({
              current_match: null,
              next_match: null,
              last_match: null,
              upcoming_events: []
            })
            .eq('id', entity.id)

          issuesFixed++
          continue
        }

        // Validate match data
        const validatedMatches = actualMatches.filter(match => {
          // Check 1: Team names must match entity
          const entityNameLower = entity.name.toLowerCase()
          const homeTeamLower = (match.team_home || '').toLowerCase()
          const awayTeamLower = (match.team_away || '').toLowerCase()
          
          if (!homeTeamLower.includes(entityNameLower) && !awayTeamLower.includes(entityNameLower)) {
            issuesFound++
            logIssue(supabase, {
              check_type: 'team_name_mismatch',
              entity_id: entity.id,
              entity_name: entity.name,
              issue_type: 'incorrect_team_match',
              issue_description: `Match ${match.team_home} vs ${match.team_away} doesn't belong to ${entity.name}`,
              action_taken: 'filtered_out',
              severity: 'warning',
              auto_fixed: true,
              before_data: match
            })
            return false
          }

          // Check 2: League validation
          const matchLeague = (match.league || '').toLowerCase()
          if (league && matchLeague && !matchLeague.includes(league.toLowerCase())) {
            issuesFound++
            logIssue(supabase, {
              check_type: 'league_mismatch',
              entity_id: entity.id,
              entity_name: entity.name,
              issue_type: 'incorrect_league',
              issue_description: `Match league "${match.league}" doesn't match team league "${league}"`,
              action_taken: 'filtered_out',
              severity: 'warning',
              auto_fixed: true,
              before_data: match
            })
            return false
          }

          // Check 3: Valid teams exist
          if (!match.team_home || !match.team_away) {
            issuesFound++
            logIssue(supabase, {
              check_type: 'missing_teams',
              entity_id: entity.id,
              entity_name: entity.name,
              issue_type: 'incomplete_match_data',
              issue_description: 'Match has missing team names',
              action_taken: 'filtered_out',
              severity: 'error',
              auto_fixed: true,
              before_data: match
            })
            return false
          }

          return true
        })

        // Find live, completed, and scheduled matches
        const liveMatch = validatedMatches.find(m => 
          m.status === 'InProgress' || m.status === 'Halftime'
        )

        const completedMatches = validatedMatches
          .filter(m => m.status === 'FullTime' || m.status === 'Finished')
          .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())

        const scheduledMatches = validatedMatches
          .filter(m => m.status === 'Scheduled' || m.status === 'Not Started')
          .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

        // Build corrected match data
        const correctedData: any = {
          current_match: liveMatch ? {
            status: 'live',
            league: liveMatch.league,
            home_team: liveMatch.team_home,
            away_team: liveMatch.team_away,
            home_score: liveMatch.score_home || 0,
            away_score: liveMatch.score_away || 0,
            match_time: "LIVE",
            commentary: generateCommentary(entity.name, liveMatch.score_home || 0, liveMatch.score_away || 0),
            match_id: liveMatch.match_id
          } : null,
          
          last_match: completedMatches[0] ? {
            home_team: completedMatches[0].team_home,
            away_team: completedMatches[0].team_away,
            home_score: completedMatches[0].score_home,
            away_score: completedMatches[0].score_away,
            league: completedMatches[0].league,
            date: new Date(completedMatches[0].match_date).toLocaleDateString('en-US', { 
              month: 'short', day: 'numeric', year: 'numeric' 
            })
          } : null,

          next_match: scheduledMatches[0] ? {
            home_team: scheduledMatches[0].team_home,
            away_team: scheduledMatches[0].team_away,
            league: scheduledMatches[0].league,
            date: new Date(scheduledMatches[0].match_date).toLocaleDateString('en-US', { 
              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            venue: entity.stats?.stadium || 'Stadium'
          } : null,

          upcoming_events: scheduledMatches.slice(0, 3).map(match => ({
            title: `${match.team_home} vs ${match.team_away}`,
            date: new Date(match.match_date).toLocaleDateString('en-US', { 
              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            venue: match.team_home === entity.name 
              ? (entity.stats?.stadium || 'Home Stadium')
              : 'Away Stadium'
          }))
        }

        // Check if data needs updating
        const needsUpdate = 
          JSON.stringify(entity.current_match) !== JSON.stringify(correctedData.current_match) ||
          JSON.stringify(entity.next_match) !== JSON.stringify(correctedData.next_match) ||
          JSON.stringify(entity.last_match) !== JSON.stringify(correctedData.last_match)

        if (needsUpdate) {
          // Update entity with corrected data
          await supabase
            .from('fan_entities')
            .update(correctedData)
            .eq('id', entity.id)

          issuesFixed++
          
          await logIssue(supabase, {
            check_type: 'data_correction',
            entity_id: entity.id,
            entity_name: entity.name,
            issue_type: 'outdated_match_data',
            issue_description: 'Match data was outdated or inconsistent',
            action_taken: 'updated_with_validated_data',
            severity: 'info',
            auto_fixed: true,
            before_data: {
              current_match: entity.current_match,
              next_match: entity.next_match,
              last_match: entity.last_match
            },
            after_data: correctedData
          })

          console.log(`✅ Auto-corrected data for ${entity.name}`)
        }

      } catch (err) {
        errors++
        console.error(`Error processing ${entity.name}:`, err)
        
        await logIssue(supabase, {
          check_type: 'processing_error',
          entity_id: entity.id,
          entity_name: entity.name,
          issue_type: 'system_error',
          issue_description: `Error during consistency check: ${err instanceof Error ? err.message : 'Unknown error'}`,
          action_taken: 'skipped',
          severity: 'error',
          auto_fixed: false
        })
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`✅ Consistency check complete!`)
    console.log(`📊 Issues found: ${issuesFound}`)
    console.log(`🔧 Issues auto-fixed: ${issuesFixed}`)
    console.log(`❌ Errors: ${errors}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: {
          entities_checked: entities?.length || 0,
          issues_found: issuesFound,
          issues_fixed: issuesFixed,
          errors: errors
        },
        message: `Checked ${entities?.length || 0} entities, fixed ${issuesFixed} issues`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Error in data-consistency-monitor:', error)
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

// Helper function to log issues
async function logIssue(supabase: any, data: {
  check_type: string
  entity_id?: string
  entity_name?: string
  issue_type: string
  issue_description: string
  action_taken: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  auto_fixed: boolean
  before_data?: any
  after_data?: any
}) {
  try {
    await supabase
      .from('data_monitor_log')
      .insert({
        ...data,
        timestamp: new Date().toISOString()
      })
  } catch (err) {
    console.error('Failed to log issue:', err)
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
