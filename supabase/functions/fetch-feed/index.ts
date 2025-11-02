import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const fetchSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10)
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate input
    const body = await req.json().catch(() => ({}))
    const validated = fetchSchema.parse(body)
    const { limit } = validated

    console.log('Fetching feed with limit:', limit)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Calculate 24 hours ago timestamp
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { data: gists, error } = await supabase
      .from('gists')
      .select('*')
      .gte('published_at', twentyFourHoursAgo.toISOString())
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Failed to fetch gists: ${error.message}`)
    }

    console.log(`Fetched ${gists?.length || 0} gists`)

    return new Response(
      JSON.stringify({ gists }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in fetch-feed function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
