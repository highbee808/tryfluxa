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
    console.log('📰 Fetching team news and updates...')
    
    const apiKey = Deno.env.get('SPORTSDATA_API_KEY')
    if (!apiKey) {
      throw new Error('SPORTSDATA_API_KEY not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all sports entities
    const { data: entities, error: entitiesError } = await supabase
      .from('fan_entities')
      .select('*')
      .eq('category', 'sports')

    if (entitiesError) throw entitiesError

    let updatedCount = 0
    const errors = []

    for (const entity of entities || []) {
      try {
        const teamName = entity.name
        const league = entity.stats?.league || 'Premier League'
        
        // Fetch news for this team
        const newsResponse = await fetch(
          `https://api.sportsdata.io/v4/soccer/scores/json/NewsByTeam/${encodeURIComponent(teamName)}`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': apiKey,
            },
          }
        )

        let news = []
        if (newsResponse.ok) {
          news = await newsResponse.json()
          // Take latest 10 news items
          news = news.slice(0, 10).map((item: any) => ({
            title: item.Title,
            content: item.Content,
            url: item.Url,
            source: item.Source,
            published: item.Updated || item.TimeAgo,
            image: item.OriginalSourceUrl,
          }))
        }

        // Fetch team injuries/suspensions
        const injuriesResponse = await fetch(
          `https://api.sportsdata.io/v4/soccer/scores/json/InjuriesByTeam/${encodeURIComponent(teamName)}`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': apiKey,
            },
          }
        )

        let injuries = []
        if (injuriesResponse.ok) {
          const injuryData = await injuriesResponse.json()
          injuries = injuryData.map((inj: any) => ({
            player: inj.Name,
            type: inj.InjuryBodyPart,
            status: inj.Status,
            expected_return: inj.ExpectedReturn,
          }))
        }

        // Fetch team standings
        const standingsResponse = await fetch(
          `https://api.sportsdata.io/v4/soccer/scores/json/Standings/${encodeURIComponent(league)}`,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': apiKey,
            },
          }
        )

        let standings = null
        if (standingsResponse.ok) {
          const standingsData = await standingsResponse.json()
          const teamStanding = standingsData.find((s: any) => 
            s.Name?.toLowerCase().includes(teamName.toLowerCase())
          )
          if (teamStanding) {
            standings = {
              position: teamStanding.Position,
              played: teamStanding.Games,
              wins: teamStanding.Wins,
              draws: teamStanding.Draws,
              losses: teamStanding.Losses,
              goals_for: teamStanding.GoalsFor,
              goals_against: teamStanding.GoalsAgainst,
              goal_difference: teamStanding.GoalsDifferential,
              points: teamStanding.Points,
            }
          }
        }

        // Update entity with comprehensive data
        const newsArray = Array.isArray(entity.news_feed) ? entity.news_feed : []
        const updatedNewsFeed = [...news, ...newsArray].slice(0, 20) // Keep latest 20

        const { error: updateError } = await supabase
          .from('fan_entities')
          .update({
            news_feed: updatedNewsFeed,
            stats: {
              ...(entity.stats || {}),
              injuries,
              standings,
              last_news_update: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', entity.id)

        if (updateError) {
          console.error(`Error updating ${teamName}:`, updateError)
          errors.push(`${teamName}: ${updateError.message}`)
        } else {
          updatedCount++
          console.log(`✅ Updated ${teamName} with ${news.length} news items`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Error processing ${entity.name}:`, errorMsg)
        errors.push(`${entity.name}: ${errorMsg}`)
      }
    }

    console.log(`✅ Team news updated for ${updatedCount} entities`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updatedCount,
        errors: errors.length,
        message: `Team news updated for ${updatedCount} entities with ${errors.length} errors`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in fetch-team-news:', error)
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
