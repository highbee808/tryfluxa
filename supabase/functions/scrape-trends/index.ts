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

    // Use Lovable AI to search for current trending topics
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a trending topics analyzer. Today's date is ${currentDate}. 
Return ONLY a valid JSON object with a "trends" array containing exactly 7 trending topics happening RIGHT NOW today.
Each topic must be current, recent, and trending in the last 24 hours.

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

Format: {"trends": [{"topic": "brief 3-5 word description", "category": "one of the categories above"}]}

Focus on: breaking news, viral moments, celebrity updates, sports events, tech announcements, entertainment news.`
          },
          {
            role: 'user',
            content: `What are the 7 most trending topics happening TODAY (${currentDate})? Return ONLY valid JSON.`
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
