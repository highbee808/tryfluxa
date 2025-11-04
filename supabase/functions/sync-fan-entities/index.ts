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
    console.log('🔄 Syncing fan entities from match data...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all unique teams from match_results
    const { data: matches, error: matchError } = await supabase
      .from('match_results')
      .select('team_home, team_away, league')
      .limit(1000)

    if (matchError) {
      throw matchError
    }

    // Extract unique teams
    const teamsSet = new Set<string>()
    const teamLeagues: Record<string, string> = {}
    
    matches?.forEach((match: any) => {
      if (match.team_home) {
        teamsSet.add(match.team_home)
        teamLeagues[match.team_home] = match.league
      }
      if (match.team_away) {
        teamsSet.add(match.team_away)
        teamLeagues[match.team_away] = match.league
      }
    })

    console.log(`Found ${teamsSet.size} unique teams`)

    // Create fan entities for each team
    let created = 0
    let skipped = 0

    for (const teamName of teamsSet) {
      const slug = teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      
      // Check if entity already exists
      const { data: existing } = await supabase
        .from('fan_entities')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Create new entity
      const { error: insertError } = await supabase
        .from('fan_entities')
        .insert({
          name: teamName,
          slug,
          category: 'sports',
          bio: `Official ${teamName} fanbase. Follow for live updates, match discussions, and community banter.`,
          api_source: 'sportsdata',
          stats: {
            league: teamLeagues[teamName],
            followers: 0
          }
        })

      if (insertError) {
        console.error(`Error creating entity for ${teamName}:`, insertError)
      } else {
        created++
      }
    }

    // Add some sample music artists
    const artists = [
      { name: 'Drake', bio: 'Canadian rapper, singer, and actor. 6 God. OVO Sound.' },
      { name: 'Taylor Swift', bio: 'Singer-songwriter. Multiple Grammy winner. Swiftie HQ.' },
      { name: 'The Weeknd', bio: 'R&B artist. XO. After Hours.' },
      { name: 'Bad Bunny', bio: 'Puerto Rican rapper and singer. El Conejo Malo.' },
      { name: 'Beyoncé', bio: 'Queen Bey. Icon. Legend. Renaissance.' },
    ]

    for (const artist of artists) {
      const slug = artist.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      
      const { data: existing } = await supabase
        .from('fan_entities')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!existing) {
        await supabase
          .from('fan_entities')
          .insert({
            name: artist.name,
            slug,
            category: 'music',
            bio: artist.bio,
            stats: {
              followers: 0,
              monthly_listeners: '50M+'
            }
          })
        created++
      } else {
        skipped++
      }
    }

    console.log(`✅ Sync complete: ${created} created, ${skipped} skipped`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        created,
        skipped,
        message: 'Fan entities synced successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error syncing fan entities:', error)
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
