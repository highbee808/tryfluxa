import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Team data with colors, logos, and achievements (updated 2025)
const teamData: Record<string, any> = {
  'Barcelona': {
    primary_color: '#004D98',
    secondary_color: '#A50044',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
    achievements: [
      { name: 'Champions League', count: 5 },
      { name: 'La Liga', count: 27 },
      { name: 'Copa del Rey', count: 31 },
      { name: 'Club World Cup', count: 3 }
    ]
  },
  'Real Madrid': {
    primary_color: '#FEBE10',
    secondary_color: '#00529F',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
    achievements: [
      { name: 'Champions League', count: 15 },
      { name: 'La Liga', count: 36 },
      { name: 'Copa del Rey', count: 20 },
      { name: 'Club World Cup', count: 5 }
    ]
  },
  'Manchester United': {
    primary_color: '#DA291C',
    secondary_color: '#FBE122',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
    achievements: [
      { name: 'Champions League', count: 3 },
      { name: 'Premier League', count: 20 },
      { name: 'FA Cup', count: 13 },
      { name: 'Europa League', count: 1 }
    ]
  },
  'Liverpool': {
    primary_color: '#C8102E',
    secondary_color: '#00B2A9',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
    achievements: [
      { name: 'Champions League', count: 6 },
      { name: 'Premier League', count: 1 },
      { name: 'FA Cup', count: 8 },
      { name: 'Club World Cup', count: 1 }
    ]
  },
  'Bayern Munich': {
    primary_color: '#DC052D',
    secondary_color: '#0066B2',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
    achievements: [
      { name: 'Champions League', count: 6 },
      { name: 'Bundesliga', count: 33 },
      { name: 'DFB-Pokal', count: 20 },
      { name: 'Club World Cup', count: 2 }
    ]
  },
  'Chelsea': {
    primary_color: '#034694',
    secondary_color: '#FFFFFF',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
    achievements: [
      { name: 'Champions League', count: 2 },
      { name: 'Premier League', count: 6 },
      { name: 'FA Cup', count: 8 },
      { name: 'Europa League', count: 2 }
    ]
  },
  'Manchester City': {
    primary_color: '#6CABDD',
    secondary_color: '#1C2C5B',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
    achievements: [
      { name: 'Champions League', count: 1 },
      { name: 'Premier League', count: 10 },
      { name: 'FA Cup', count: 7 },
      { name: 'League Cup', count: 8 }
    ]
  },
  'Arsenal': {
    primary_color: '#EF0107',
    secondary_color: '#FFFFFF',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
    achievements: [
      { name: 'Premier League', count: 13 },
      { name: 'FA Cup', count: 14 },
      { name: 'League Cup', count: 2 },
      { name: 'Europa League', count: 0 }
    ]
  },
  'Paris Saint-Germain': {
    primary_color: '#004170',
    secondary_color: '#DA291C',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
    achievements: [
      { name: 'Ligue 1', count: 12 },
      { name: 'Coupe de France', count: 14 },
      { name: 'Coupe de la Ligue', count: 9 },
      { name: 'Champions League', count: 0 }
    ]
  },
  'Juventus': {
    primary_color: '#000000',
    secondary_color: '#FFFFFF',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Juventus_FC_-_pictogram_black_%28Italy%2C_2017%29.svg',
    achievements: [
      { name: 'Champions League', count: 2 },
      { name: 'Serie A', count: 36 },
      { name: 'Coppa Italia', count: 14 },
      { name: 'Supercoppa', count: 9 }
    ]
  },
  'AC Milan': {
    primary_color: '#FB090B',
    secondary_color: '#000000',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
    achievements: [
      { name: 'Champions League', count: 7 },
      { name: 'Serie A', count: 19 },
      { name: 'Coppa Italia', count: 5 },
      { name: 'Club World Cup', count: 1 }
    ]
  },
  'Inter Milan': {
    primary_color: '#0068A8',
    secondary_color: '#000000',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
    achievements: [
      { name: 'Champions League', count: 3 },
      { name: 'Serie A', count: 20 },
      { name: 'Coppa Italia', count: 9 },
      { name: 'Club World Cup', count: 1 }
    ]
  },
  // Basketball Teams
  'Los Angeles Lakers': {
    primary_color: '#552583',
    secondary_color: '#FDB927',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Los_Angeles_Lakers_logo.svg',
    achievements: [
      { name: 'NBA Championships', count: 17 },
      { name: 'Conference Titles', count: 32 },
      { name: 'Division Titles', count: 24 }
    ]
  },
  'Boston Celtics': {
    primary_color: '#007A33',
    secondary_color: '#BA9653',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/8/8f/Boston_Celtics.svg',
    achievements: [
      { name: 'NBA Championships', count: 18 },
      { name: 'Conference Titles', count: 23 },
      { name: 'Division Titles', count: 33 }
    ]
  },
  'Golden State Warriors': {
    primary_color: '#1D428A',
    secondary_color: '#FFC72C',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/0/01/Golden_State_Warriors_logo.svg',
    achievements: [
      { name: 'NBA Championships', count: 7 },
      { name: 'Conference Titles', count: 12 },
      { name: 'Division Titles', count: 12 }
    ]
  },
  'Chicago Bulls': {
    primary_color: '#CE1141',
    secondary_color: '#000000',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/6/67/Chicago_Bulls_logo.svg',
    achievements: [
      { name: 'NBA Championships', count: 6 },
      { name: 'Conference Titles', count: 6 },
      { name: 'Division Titles', count: 9 }
    ]
  },
  // Additional Football Teams
  'Atletico Madrid': {
    primary_color: '#CB3524',
    secondary_color: '#1B458F',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
    achievements: [
      { name: 'La Liga', count: 11 },
      { name: 'Copa del Rey', count: 10 },
      { name: 'Europa League', count: 3 }
    ]
  },
  'Tottenham': {
    primary_color: '#132257',
    secondary_color: '#FFFFFF',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
    achievements: [
      { name: 'League Titles', count: 2 },
      { name: 'FA Cup', count: 8 },
      { name: 'League Cup', count: 4 }
    ]
  },
  'Borussia Dortmund': {
    primary_color: '#FDE100',
    secondary_color: '#000000',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
    achievements: [
      { name: 'Champions League', count: 1 },
      { name: 'Bundesliga', count: 8 },
      { name: 'DFB-Pokal', count: 5 }
    ]
  },
  'Napoli': {
    primary_color: '#0067B0',
    secondary_color: '#87CEEB',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg',
    achievements: [
      { name: 'Serie A', count: 3 },
      { name: 'Coppa Italia', count: 6 },
      { name: 'Supercoppa', count: 2 }
    ]
  },
  'Roma': {
    primary_color: '#8B0304',
    secondary_color: '#F7B500',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg',
    achievements: [
      { name: 'Serie A', count: 3 },
      { name: 'Coppa Italia', count: 9 },
      { name: 'Supercoppa', count: 2 }
    ]
  },
  'Sevilla': {
    primary_color: '#D40C23',
    secondary_color: '#FFFFFF',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg',
    achievements: [
      { name: 'Europa League', count: 7 },
      { name: 'Copa del Rey', count: 5 },
      { name: 'La Liga', count: 1 }
    ]
  },
  'Porto': {
    primary_color: '#003DA5',
    secondary_color: '#FFFFFF',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg',
    achievements: [
      { name: 'Champions League', count: 2 },
      { name: 'Primeira Liga', count: 30 },
      { name: 'Taça de Portugal', count: 19 }
    ]
  },
  'Benfica': {
    primary_color: '#DA0812',
    secondary_color: '#FFFFFF',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/a/a2/SL_Benfica_logo.svg',
    achievements: [
      { name: 'Champions League', count: 2 },
      { name: 'Primeira Liga', count: 38 },
      { name: 'Taça de Portugal', count: 26 }
    ]
  },
  'Ajax': {
    primary_color: '#D2122E',
    secondary_color: '#FFFFFF',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg',
    achievements: [
      { name: 'Champions League', count: 4 },
      { name: 'Eredivisie', count: 36 },
      { name: 'KNVB Cup', count: 20 }
    ]
  },
  // Additional Basketball Teams
  'Miami Heat': {
    primary_color: '#98002E',
    secondary_color: '#F9A01B',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/f/fb/Miami_Heat_logo.svg',
    achievements: [
      { name: 'NBA Championships', count: 3 },
      { name: 'Conference Titles', count: 7 },
      { name: 'Division Titles', count: 16 }
    ]
  },
  'Brooklyn Nets': {
    primary_color: '#000000',
    secondary_color: '#FFFFFF',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Brooklyn_Nets_newlogo.svg',
    achievements: [
      { name: 'Conference Titles', count: 2 },
      { name: 'Division Titles', count: 5 }
    ]
  },
  'Milwaukee Bucks': {
    primary_color: '#00471B',
    secondary_color: '#EEE1C6',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/4/4a/Milwaukee_Bucks_logo.svg',
    achievements: [
      { name: 'NBA Championships', count: 2 },
      { name: 'Conference Titles', count: 3 },
      { name: 'Division Titles', count: 17 }
    ]
  },
  'Philadelphia 76ers': {
    primary_color: '#006BB6',
    secondary_color: '#ED174C',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/0/0e/Philadelphia_76ers_logo.svg',
    achievements: [
      { name: 'NBA Championships', count: 3 },
      { name: 'Conference Titles', count: 5 },
      { name: 'Division Titles', count: 12 }
    ]
  },
  'Phoenix Suns': {
    primary_color: '#1D1160',
    secondary_color: '#E56020',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/d/dc/Phoenix_Suns_logo.svg',
    achievements: [
      { name: 'Conference Titles', count: 3 },
      { name: 'Division Titles', count: 9 }
    ]
  },
  'Dallas Mavericks': {
    primary_color: '#00538C',
    secondary_color: '#002B5E',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/9/97/Dallas_Mavericks_logo.svg',
    achievements: [
      { name: 'NBA Championships', count: 1 },
      { name: 'Conference Titles', count: 3 },
      { name: 'Division Titles', count: 5 }
    ]
  },
  'New York Knicks': {
    primary_color: '#006BB6',
    secondary_color: '#F58426',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/2/25/New_York_Knicks_logo.svg',
    achievements: [
      { name: 'NBA Championships', count: 2 },
      { name: 'Conference Titles', count: 4 },
      { name: 'Division Titles', count: 8 }
    ]
  },
  'Toronto Raptors': {
    primary_color: '#CE1141',
    secondary_color: '#000000',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/3/36/Toronto_Raptors_logo.svg',
    achievements: [
      { name: 'NBA Championships', count: 1 },
      { name: 'Conference Titles', count: 1 },
      { name: 'Division Titles', count: 7 }
    ]
  },
  'Denver Nuggets': {
    primary_color: '#0E2240',
    secondary_color: '#FEC524',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/7/76/Denver_Nuggets.svg',
    achievements: [
      { name: 'NBA Championships', count: 1 },
      { name: 'Conference Titles', count: 1 },
      { name: 'Division Titles', count: 10 }
    ]
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders })
  }

  try {
    console.log('🔄 Syncing fan entities from match data...')
    
    // Validate required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required environment variables')
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured')
    }
    
    console.log('✅ Environment variables loaded successfully')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all matches including live/scheduled ones
    const { data: matches, error: matchError } = await supabase
      .from('match_results')
      .select('team_home, team_away, league, status, score_home, score_away, match_date, match_id')
      .order('match_date', { ascending: false })
      .limit(1000)

    if (matchError) {
      console.error('❌ Error fetching matches:', matchError)
      throw matchError
    }
    
    console.log(`✅ Fetched ${matches?.length || 0} matches successfully`)

    // Extract unique teams and their current matches
    const teamsSet = new Set<string>()
    const teamLeagues: Record<string, string> = {}
    const teamMatches: Record<string, any> = {}
    
    matches?.forEach((match: any) => {
      if (match.team_home) {
        teamsSet.add(match.team_home)
        teamLeagues[match.team_home] = match.league
        
        // Store current/upcoming match for each team (live or scheduled)
        if ((match.status === 'live' || match.status === 'scheduled') && !teamMatches[match.team_home]) {
          teamMatches[match.team_home] = {
            status: match.status,
            league: match.league,
            home_team: match.team_home,
            away_team: match.team_away,
            home_score: match.score_home || 0,
            away_score: match.score_away || 0,
            match_time: new Date(match.match_date).toLocaleString(),
            match_id: match.match_id
          }
        }
      }
      if (match.team_away) {
        teamsSet.add(match.team_away)
        teamLeagues[match.team_away] = match.league
        
        // Store current/upcoming match for each team
        if ((match.status === 'live' || match.status === 'scheduled') && !teamMatches[match.team_away]) {
          teamMatches[match.team_away] = {
            status: match.status,
            league: match.league,
            home_team: match.team_home,
            away_team: match.team_away,
            home_score: match.score_home || 0,
            away_score: match.score_away || 0,
            match_time: new Date(match.match_date).toLocaleString(),
            match_id: match.match_id
          }
        }
      }
    })

    console.log(`Found ${teamsSet.size} unique teams`)

    // Create/update fan entities for each team
    let created = 0
    let updated = 0

    for (const teamName of teamsSet) {
      const slug = teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const data = teamData[teamName] || {}
      
      // Upsert entity with all data
      const { error: upsertError } = await supabase
        .from('fan_entities')
        .upsert({
          name: teamName,
          slug,
          category: 'sports',
          bio: `Official ${teamName} fanbase. Follow for live updates, match discussions, and community banter.`,
          api_source: 'sportsdata',
          logo_url: data.logo_url || null,
          primary_color: data.primary_color || null,
          secondary_color: data.secondary_color || null,
          stats: {
            league: teamLeagues[teamName],
            followers: 0
          },
          achievements: data.achievements || [],
          current_match: teamMatches[teamName] || null,
          next_match: {
            home_team: teamName,
            away_team: 'TBD',
            league: teamLeagues[teamName],
            date: 'Nov 15, 2025 - 8:00 PM'
          },
          last_match: {
            home_team: teamName,
            away_team: 'Previous Opponent',
            home_score: 2,
            away_score: 1,
            league: teamLeagues[teamName],
            date: 'Nov 1, 2025'
          },
          upcoming_events: [
            { title: `${teamName} vs TBD`, date: 'Nov 15, 2025', venue: 'Home Stadium' },
            { title: `Away vs TBD`, date: 'Nov 22, 2025', venue: 'Away Stadium' },
            { title: `${teamName} vs TBD`, date: 'Nov 29, 2025', venue: 'Home Stadium' }
          ],
          news_feed: []
        }, {
          onConflict: 'slug',
          ignoreDuplicates: false
        })

      if (upsertError) {
        console.error(`Error upserting entity for ${teamName}:`, upsertError)
      } else {
        updated++
      }
    }

    // Add music artists
    const artists = [
      { 
        name: 'Drake', 
        bio: 'Canadian rapper, singer, and actor. 6 God. OVO Sound.',
        primary_color: '#FFD700',
        secondary_color: '#000000',
        logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Drake_July_2016.jpg',
        achievements: [
          { name: 'Grammy Awards', count: 5 },
          { name: 'Billboard #1 Albums', count: 11 }
        ]
      },
      { 
        name: 'Taylor Swift', 
        bio: 'Singer-songwriter. Multiple Grammy winner. Swiftie HQ.',
        primary_color: '#B58AC6',
        secondary_color: '#FFE4E1',
        logo_url: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/191125_Taylor_Swift_at_the_2019_American_Music_Awards_%28cropped%29.png',
        achievements: [
          { name: 'Grammy Awards', count: 14 },
          { name: 'Billboard #1 Albums', count: 13 }
        ]
      },
      { 
        name: 'The Weeknd', 
        bio: 'R&B artist. XO. After Hours.',
        primary_color: '#FF0000',
        secondary_color: '#000000',
        logo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/32/The_Weeknd_in_2018.png',
        achievements: [
          { name: 'Grammy Awards', count: 4 },
          { name: 'Billboard #1 Singles', count: 6 }
        ]
      },
      { 
        name: 'Beyoncé', 
        bio: 'Queen Bey. Icon. Legend. Renaissance.',
        primary_color: '#FFD700',
        secondary_color: '#000000',
        logo_url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Beyonc%C3%A9_at_The_Lion_King_European_Premiere_2019.png',
        achievements: [
          { name: 'Grammy Awards', count: 32 },
          { name: 'Billboard #1 Albums', count: 8 }
        ]
      },
      { 
        name: 'Bad Bunny', 
        bio: 'Puerto Rican rapper and singer. El Conejo Malo.',
        primary_color: '#FF6B35',
        secondary_color: '#F7931E',
        logo_url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Bad_Bunny_2019_by_Glenn_Francis_%28cropped%29.jpg',
        achievements: [
          { name: 'Grammy Awards', count: 2 },
          { name: 'Billboard #1 Albums', count: 4 }
        ]
      },
      { 
        name: 'Wizkid', 
        bio: 'Nigerian superstar. Afrobeats pioneer. Starboy.',
        primary_color: '#006B3F',
        secondary_color: '#FFD700',
        logo_url: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Wizkid_in_2018.jpg',
        achievements: [
          { name: 'Grammy Awards', count: 1 },
          { name: 'MOBO Awards', count: 4 }
        ]
      },
      { 
        name: 'Davido', 
        bio: 'Nigerian music icon. OBO. Afrobeats king.',
        primary_color: '#008751',
        secondary_color: '#FCD116',
        logo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Davido_2019_by_Glenn_Francis.jpg',
        achievements: [
          { name: 'BET Awards', count: 2 },
          { name: 'MTV Africa Music Awards', count: 5 }
        ]
      },
      { 
        name: 'Tems', 
        bio: 'Nigerian R&B sensation. Grammy winner. Leading lady.',
        primary_color: '#008751',
        secondary_color: '#FCD116',
        logo_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Tems_in_2023.jpg',
        achievements: [
          { name: 'Grammy Awards', count: 1 },
          { name: 'BET Awards', count: 1 }
        ]
      },
    ]

    for (const artist of artists) {
      const slug = artist.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      
      const { error: upsertError } = await supabase
        .from('fan_entities')
        .upsert({
          name: artist.name,
          slug,
          category: 'music',
          bio: artist.bio,
          logo_url: artist.logo_url,
          primary_color: artist.primary_color,
          secondary_color: artist.secondary_color,
          stats: {
            followers: 0,
            monthly_listeners: '50M+'
          },
          achievements: artist.achievements,
          next_match: {
            event_name: `${artist.name} World Tour`,
            venue: 'Madison Square Garden',
            date: 'Dec 20, 2025'
          },
          last_match: {
            event_name: `${artist.name} Live`,
            venue: 'Arena',
            date: 'Nov 5, 2025'
          },
          upcoming_events: [
            { title: `${artist.name} - NYC`, date: 'Dec 20, 2025', venue: 'Madison Square Garden' },
            { title: `${artist.name} - LA`, date: 'Dec 27, 2025', venue: 'Crypto.com Arena' },
            { title: `${artist.name} - Miami`, date: 'Jan 3, 2026', venue: 'FTX Arena' }
          ],
          news_feed: []
        }, {
          onConflict: 'slug',
          ignoreDuplicates: false
        })

      if (!upsertError) {
        updated++
      }
    }
    
    // Basketball teams are now synced from match_results with proper team codes
    // No need for static basketball data - entities use API abbreviations (DAL, PHO, etc.)

    console.log(`✅ Sync complete: ${updated} entities synced`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: updated,
        message: 'Fan entities synced successfully with logos, colors, and achievements'
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
