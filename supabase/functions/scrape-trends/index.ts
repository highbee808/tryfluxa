import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Trend {
  title: string
  source: string
  category: string
  url?: string
  published_at?: string
  popularity_score: number
}

// Fetch trends from NewsAPI
async function fetchNewsAPI(): Promise<Trend[]> {
  try {
    const apiKey = Deno.env.get('NEWSAPI_KEY')
    if (!apiKey) {
      console.log('⚠️ NewsAPI key not configured')
      return []
    }

    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=20&apiKey=${apiKey}`
    )
    
    if (!response.ok) {
      console.log('⚠️ NewsAPI error:', response.status)
      return []
    }
    
    const data = await response.json()
    return (data.articles || []).map((article: any) => ({
      title: article.title,
      source: 'NewsAPI',
      category: categorizeArticle(article.title),
      url: article.url,
      published_at: article.publishedAt,
      popularity_score: 5,
    }))
  } catch (error) {
    console.error('NewsAPI error:', error)
    return []
  }
}

// Fetch trends from Mediastack
async function fetchMediastack(): Promise<Trend[]> {
  try {
    const apiKey = Deno.env.get('MEDIASTACK_KEY')
    if (!apiKey) {
      console.log('⚠️ Mediastack key not configured')
      return []
    }

    const response = await fetch(
      `http://api.mediastack.com/v1/news?access_key=${apiKey}&countries=us&limit=20&sort=published_desc`
    )
    
    if (!response.ok) {
      console.log('⚠️ Mediastack error:', response.status)
      return []
    }
    
    const data = await response.json()
    return (data.data || []).map((article: any) => ({
      title: article.title,
      source: 'Mediastack',
      category: categorizeArticle(article.title),
      url: article.url,
      published_at: article.published_at,
      popularity_score: 4,
    }))
  } catch (error) {
    console.error('Mediastack error:', error)
    return []
  }
}

// Fetch trends from The Guardian
async function fetchGuardian(): Promise<Trend[]> {
  try {
    const apiKey = Deno.env.get('GUARDIAN_API_KEY')
    if (!apiKey) {
      console.log('⚠️ Guardian API key not configured')
      return []
    }

    const response = await fetch(
      `https://content.guardianapis.com/search?api-key=${apiKey}&page-size=20&order-by=newest&show-fields=all`
    )
    
    if (!response.ok) {
      console.log('⚠️ Guardian API error:', response.status)
      return []
    }
    
    const data = await response.json()
    return (data.response?.results || []).map((article: any) => ({
      title: article.webTitle,
      source: 'The Guardian',
      category: mapGuardianSection(article.sectionName),
      url: article.webUrl,
      published_at: article.webPublicationDate,
      popularity_score: 6,
    }))
  } catch (error) {
    console.error('Guardian API error:', error)
    return []
  }
}

// Fetch trends from Reddit
async function fetchReddit(): Promise<Trend[]> {
  try {
    const clientId = Deno.env.get('REDDIT_CLIENT_ID')
    const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET')
    if (!clientId || !clientSecret) {
      console.log('⚠️ Reddit credentials not configured')
      return []
    }

    // Get access token
    const authResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    if (!authResponse.ok) {
      console.log('⚠️ Reddit auth error:', authResponse.status)
      return []
    }
    
    const authData = await authResponse.json()
    const accessToken = authData.access_token

    // Fetch hot posts
    const response = await fetch('https://oauth.reddit.com/hot?limit=20', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Fluxa/1.0',
      },
    })

    if (!response.ok) {
      console.log('⚠️ Reddit fetch error:', response.status)
      return []
    }
    
    const data = await response.json()
    return (data.data?.children || []).map((post: any) => ({
      title: post.data.title,
      source: 'Reddit',
      category: categorizeArticle(post.data.title),
      url: `https://reddit.com${post.data.permalink}`,
      published_at: new Date(post.data.created_utc * 1000).toISOString(),
      popularity_score: Math.min(10, Math.floor(post.data.score / 1000)),
    }))
  } catch (error) {
    console.error('Reddit API error:', error)
    return []
  }
}

// Categorize article based on title keywords
function categorizeArticle(title: string): string {
  const lower = title.toLowerCase()
  
  if (/(football|soccer|basketball|nba|nfl|sports|barcelona|real madrid|messi|ronaldo|championship|league|match|game|team)/i.test(lower)) {
    return 'Sports'
  }
  if (/(celebrity|star|actor|actress|singer|musician|drake|beyonce|taylor swift|kardashian|fame)/i.test(lower)) {
    return 'Celebrity Gossip'
  }
  if (/(tech|ai|apple|google|tesla|iphone|android|software|startup|innovation)/i.test(lower)) {
    return 'Tech'
  }
  if (/(business|stock|market|economy|company|startup|bitcoin|crypto)/i.test(lower)) {
    return 'Tech'
  }
  if (/(movie|film|tv|show|entertainment|music|album|concert|festival)/i.test(lower)) {
    return 'Music'
  }
  if (/(meme|viral|funny|trending|tiktok|instagram)/i.test(lower)) {
    return 'Memes'
  }
  if (/(fashion|style|outfit|runway|designer|vogue)/i.test(lower)) {
    return 'Fashion'
  }
  if (/(gaming|esports|video game|xbox|playstation|nintendo|steam)/i.test(lower)) {
    return 'Gaming'
  }
  if (/(anime|manga|otaku|crunchyroll)/i.test(lower)) {
    return 'Anime'
  }
  if (/(food|recipe|restaurant|chef|cooking)/i.test(lower)) {
    return 'Food'
  }
  if (/(politics|election|government|president|senate|congress)/i.test(lower)) {
    return 'Politics'
  }
  
  return 'Celebrity Gossip'
}

// Map Guardian sections to our categories
function mapGuardianSection(section: string): string {
  const sectionMap: Record<string, string> = {
    'Sport': 'Sports',
    'Football': 'Sports',
    'Technology': 'Tech',
    'Business': 'Tech',
    'Film': 'Movies',
    'Music': 'Music',
    'Culture': 'Celebrity Gossip',
    'Fashion': 'Fashion',
    'Games': 'Gaming',
    'Food': 'Food',
    'Politics': 'Politics',
  }
  
  return sectionMap[section] || 'Celebrity Gossip'
}

// Deduplicate trends by title similarity
function deduplicateTrends(trends: Trend[]): Trend[] {
  const seen = new Set<string>()
  const unique: Trend[] = []
  
  for (const trend of trends) {
    const normalized = trend.title.toLowerCase().replace(/[^a-z0-9]/g, '')
    const shortened = normalized.substring(0, 50)
    
    if (!seen.has(shortened)) {
      seen.add(shortened)
      unique.push(trend)
    }
  }
  
  return unique
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔍 Aggregating trends from multiple sources...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch from all sources in parallel
    const [newsApiTrends, mediastackTrends, guardianTrends, redditTrends] = await Promise.all([
      fetchNewsAPI(),
      fetchMediastack(),
      fetchGuardian(),
      fetchReddit(),
    ])

    console.log(`📊 Fetched: NewsAPI=${newsApiTrends.length}, Mediastack=${mediastackTrends.length}, Guardian=${guardianTrends.length}, Reddit=${redditTrends.length}`)

    // Combine all trends
    let allTrends = [
      ...newsApiTrends,
      ...mediastackTrends,
      ...guardianTrends,
      ...redditTrends,
    ]

    // Deduplicate and sort by popularity
    allTrends = deduplicateTrends(allTrends)
    allTrends.sort((a, b) => b.popularity_score - a.popularity_score)

    // Take top 20 trends
    const topTrends = allTrends.slice(0, 20)

    // Store in raw_trends table
    if (topTrends.length > 0) {
      const { error: insertError } = await supabase
        .from('raw_trends')
        .insert(topTrends.map(trend => ({
          title: trend.title,
          source: trend.source,
          category: trend.category,
          url: trend.url,
          published_at: trend.published_at,
          popularity_score: trend.popularity_score,
          processed: false,
        })))

      if (insertError) {
        console.error('❌ Error storing trends:', insertError)
      } else {
        console.log(`✅ Stored ${topTrends.length} trends in database`)
      }
    }

    // Return formatted trends for immediate use (top 10)
    const formattedTrends = topTrends.slice(0, 10).map(trend => ({
      topic: trend.title,
      category: trend.category,
      source_url: trend.url,
      published_at: trend.published_at,
    }))

    console.log(`✅ Returning ${formattedTrends.length} trends`)

    return new Response(
      JSON.stringify({ 
        trends: formattedTrends,
        total_fetched: allTrends.length,
        sources_used: [
          newsApiTrends.length > 0 ? 'NewsAPI' : null,
          mediastackTrends.length > 0 ? 'Mediastack' : null,
          guardianTrends.length > 0 ? 'Guardian' : null,
          redditTrends.length > 0 ? 'Reddit' : null,
        ].filter(Boolean),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('❌ Error in scrape-trends:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        trends: [], // Return empty array as fallback
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
