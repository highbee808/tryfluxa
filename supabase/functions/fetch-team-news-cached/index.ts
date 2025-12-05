import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache duration: 6 hours (in milliseconds)
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders })
  }

  try {
    console.log('📰 Fetching team news with caching...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all sports entities
    const { data: entities, error: entitiesError } = await supabase
      .from('fan_entities')
      .select('*')
      .eq('category', 'sports')

    if (entitiesError) throw entitiesError

    let updatedCount = 0
    let cachedCount = 0

    for (const entity of entities || []) {
      try {
        const entityName = entity.name

        // Check cache first
        const { data: cached } = await supabase
          .from('news_cache')
          .select('*')
          .eq('entity', entityName)
          .gte('cached_at', new Date(Date.now() - CACHE_DURATION_MS).toISOString())
          .order('cached_at', { ascending: false })
          .limit(1)
          .single()

        if (cached) {
          console.log(`✅ Cache hit for ${entityName}`)
          cachedCount++
          
          // Update entity with cached news
          if (cached.news_data && Array.isArray(cached.news_data)) {
            await supabase
              .from('fan_entities')
              .update({ 
                news_feed: cached.news_data,
                updated_at: new Date().toISOString()
              })
              .eq('id', entity.id)
          }
          continue
        }

        // Cache miss - fetch fresh data
        console.log(`❌ Cache miss for ${entityName}, fetching fresh data...`)
        
        // Call the original fetch-team-news function for this specific team
        const { data: newsData, error: newsError } = await supabase.functions.invoke('fetch-team-news', {
          body: { teamName: entityName }
        })

        if (newsError) {
          console.error(`Error fetching news for ${entityName}:`, newsError)
          continue
        }

        // Store in cache
        await supabase
          .from('news_cache')
          .insert({
            entity: entityName,
            news_data: newsData?.news || [],
            cached_at: new Date().toISOString(),
          })

        updatedCount++
        console.log(`✅ Updated news for ${entityName}`)

      } catch (err) {
        console.error(`Failed to process ${entity.name}:`, err)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updatedCount,
        cached: cachedCount,
        total: (entities || []).length,
        message: `Updated ${updatedCount} teams, served ${cachedCount} from cache`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
