import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Fetching real-time trending topics...')

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    const currentDate = new Date().toISOString().split('T')[0]
    console.log('Current date:', currentDate)

    // Use Lovable AI with GPT-5 Mini for real-time trending topics
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `You are a real-time trending topics analyzer with access to current news. Today's date is ${currentDate}. 
Return ONLY a valid JSON object with a "trends" array containing exactly 7 trending topics happening RIGHT NOW today.
Each topic must be ACTUAL current news from the last 24 hours - not generic trends.

CRITICAL SPECIFICITY RULES:
- For sports teams, use FULL team names: "Barcelona FC latest match" not just "Barcelona"
- For artists, include context: "Drake new album drop" not just "Drake"
- For teams/clubs, specify: "Real Madrid Champions League" not just "Real Madrid"
- Make topics specific and newsworthy

Use these valid categories (choose the most relevant one):
- Celebrity Gossip (celebrity news, red carpets, relationships)
- Sports (all sports including football, basketball, soccer, etc)
- Memes (viral memes and internet culture)
- Fashion (fashion shows, trends, style)
- Gaming (video games, esports, gaming news)
- Tech (technology, AI, startups, gadgets)
- Music (music releases, concerts, artists)
- Anime (anime releases, manga, otaku culture)
- Movies (movie releases, reviews, box office)
- Politics (political news, elections, policy)
- Food (food trends, recipes, restaurants)

Format: {"trends": [{"topic": "specific newsworthy description", "category": "one of the categories above"}]}

Focus on: ACTUAL breaking news, viral moments happening now, celebrity updates from today, live sports events, tech announcements, entertainment news.`
          },
          {
            role: 'user',
            content: `What are the 7 most trending topics with ACTUAL NEWS happening TODAY (${currentDate})? Be specific and newsworthy. Return ONLY valid JSON.`
          }
        ],
        response_format: { type: 'json_object' }
      }),
    })

    if (!response.ok) {
      console.error('AI API error:', response.status)
      // Fallback to curated current topics with all valid categories
      const fallbackTopics = [
        { topic: 'AI breakthrough announcement', category: 'Tech' },
        { topic: 'Championship finals', category: 'Sports' },
        { topic: 'Celebrity red carpet', category: 'Celebrity Gossip' },
        { topic: 'Viral dance challenge', category: 'Memes' },
        { topic: 'Gaming tournament', category: 'Gaming' },
        { topic: 'Fashion show highlights', category: 'Fashion' },
        { topic: 'Music awards night', category: 'Music' },
      ]
      return new Response(
        JSON.stringify({ trends: fallbackTopics }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const data = await response.json()
    const content = JSON.parse(data.choices[0].message.content)
    const trendingTopics = content.trends || content.topics || content
    
    console.log(`Found ${trendingTopics.length} trending topics for ${currentDate}`)

    return new Response(
      JSON.stringify({ trends: trendingTopics }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in scrape-trends function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
