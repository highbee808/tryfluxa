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
    console.log('Fetching trending topics...')

    // Mock trending topics for now
    // Later integrate with Google Trends, X, or Reddit APIs
    const trendingTopics = [
      { topic: 'Drake surprise drop', category: 'Music' },
      { topic: 'Messi transfer talk', category: 'Sports' },
      { topic: 'Tech layoffs 2025', category: 'Tech' },
      { topic: 'Fashion week highlights', category: 'Fashion' },
      { topic: 'Latest gaming releases', category: 'Gaming' },
      { topic: 'Celebrity red carpet', category: 'Celebrity Gossip' },
      { topic: 'Viral memes today', category: 'Memes' },
    ]

    console.log(`Found ${trendingTopics.length} trending topics`)

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
