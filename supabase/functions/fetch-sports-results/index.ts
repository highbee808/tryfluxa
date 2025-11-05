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

    // Fetch matches from the past 3 days and next 3 days
    const allMatches = []
    const errors = []
    
    for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
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
          const dayMatches = await response.json()
          allMatches.push(...dayMatches)
          console.log(`✅ Fetched ${dayMatches.length} matches for ${dateStr}`)
        } else {
          errors.push(`${dateStr}: ${response.status}`)
        }
      } catch (err) {
        errors.push(`${dateStr}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
    
    if (errors.length > 0) {
      console.warn('Some dates failed:', errors)
    }

    console.log(`Total fetched: ${allMatches.length} matches`)

    // Fetch ALL competitions - not just top leagues
    // Include Champions League, Europa League, domestic cups, etc.
    const relevantMatches = allMatches.filter((match: any) => {
      const compName = match.Competition?.Name || ''
      // Include all major competitions
      return compName.length > 0 && 
        !compName.includes('Friendly') && 
        !compName.includes('Training')
    })

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
          venue: match.VenueName,
          round: match.Round,
          referee: match.Referee,
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
