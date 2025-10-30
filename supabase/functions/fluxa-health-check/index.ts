import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthCheck {
  name: string
  status: '✅ OK' | '⚠️ Warning' | '❌ Failed'
  details: string
  timestamp: string
  latency?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results: HealthCheck[] = []
    const timestamp = new Date().toISOString()

    // 1. Database Connection Test
    try {
      const start = Date.now()
      const { data, error } = await supabase.from('gists').select('id').limit(1)
      const latency = Date.now() - start
      
      results.push({
        name: 'Database',
        status: error ? '❌ Failed' : '✅ OK',
        details: error ? error.message : `Connected (${latency}ms)`,
        timestamp,
        latency
      })
    } catch (e) {
      results.push({
        name: 'Database',
        status: '❌ Failed',
        details: e instanceof Error ? e.message : 'Unknown error',
        timestamp
      })
    }

    // 2. Storage Test
    try {
      const start = Date.now()
      const { data, error } = await supabase.storage.from('gist-audio').list('', { limit: 1 })
      const latency = Date.now() - start
      
      results.push({
        name: 'Cloud Storage',
        status: error ? '❌ Failed' : '✅ OK',
        details: error ? error.message : `Accessible (${latency}ms)`,
        timestamp,
        latency
      })
    } catch (e) {
      results.push({
        name: 'Cloud Storage',
        status: '❌ Failed',
        details: e instanceof Error ? e.message : 'Unknown error',
        timestamp
      })
    }

    // 3. OpenAI API Key Check
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    results.push({
      name: 'OpenAI API Key',
      status: openaiKey ? '✅ OK' : '❌ Failed',
      details: openaiKey ? 'Key configured' : 'Key missing',
      timestamp
    })

    // 4. Lovable AI Key Check
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')
    results.push({
      name: 'Lovable AI Key',
      status: lovableKey ? '✅ OK' : '❌ Failed',
      details: lovableKey ? 'Key configured' : 'Key missing',
      timestamp
    })

    // 5. Test Edge Functions
    const functionsToTest = [
      { name: 'fetch-feed', path: 'fetch-feed' },
      { name: 'generate-gist', path: 'generate-gist' },
      { name: 'text-to-speech', path: 'text-to-speech' },
      { name: 'publish-gist', path: 'publish-gist' }
    ]

    for (const func of functionsToTest) {
      try {
        const start = Date.now()
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/${func.path}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({})
          }
        )
        const latency = Date.now() - start

        // Even if function returns error for missing params, it means it's deployed and running
        const isDeployed = response.status !== 404
        
        results.push({
          name: `Edge Function: ${func.name}`,
          status: isDeployed ? '✅ OK' : '❌ Failed',
          details: isDeployed ? `Deployed (${latency}ms)` : 'Not found',
          timestamp,
          latency: isDeployed ? latency : undefined
        })
      } catch (e) {
        results.push({
          name: `Edge Function: ${func.name}`,
          status: '⚠️ Warning',
          details: e instanceof Error ? e.message : 'Connection error',
          timestamp
        })
      }
    }

    // 6. Memory Table Check
    try {
      const start = Date.now()
      const { data, error } = await supabase.from('fluxa_memory').select('id').limit(1)
      const latency = Date.now() - start
      
      results.push({
        name: 'Memory System',
        status: error ? '❌ Failed' : '✅ OK',
        details: error ? error.message : `Accessible (${latency}ms)`,
        timestamp,
        latency
      })
    } catch (e) {
      results.push({
        name: 'Memory System',
        status: '❌ Failed',
        details: e instanceof Error ? e.message : 'Unknown error',
        timestamp
      })
    }

    // 7. Stories Table Check
    try {
      const start = Date.now()
      const { data, error } = await supabase.from('stories').select('id').limit(1)
      const latency = Date.now() - start
      
      results.push({
        name: 'Stories System',
        status: error ? '❌ Failed' : '✅ OK',
        details: error ? error.message : `Accessible (${latency}ms)`,
        timestamp,
        latency
      })
    } catch (e) {
      results.push({
        name: 'Stories System',
        status: '❌ Failed',
        details: e instanceof Error ? e.message : 'Unknown error',
        timestamp
      })
    }

    // 8. User Roles Check
    try {
      const start = Date.now()
      const { data, error } = await supabase.from('user_roles').select('id').limit(1)
      const latency = Date.now() - start
      
      results.push({
        name: 'User Roles',
        status: error ? '❌ Failed' : '✅ OK',
        details: error ? error.message : `Accessible (${latency}ms)`,
        timestamp,
        latency
      })
    } catch (e) {
      results.push({
        name: 'User Roles',
        status: '❌ Failed',
        details: e instanceof Error ? e.message : 'Unknown error',
        timestamp
      })
    }

    // Log results to database
    for (const result of results) {
      await supabase.from('fluxa_health_log').insert({
        component: result.name,
        status: result.status,
        details: { message: result.details, latency: result.latency }
      })
    }

    // Calculate overall health
    const totalChecks = results.length
    const passedChecks = results.filter(r => r.status === '✅ OK').length
    const healthPercentage = Math.round((passedChecks / totalChecks) * 100)

    return new Response(
      JSON.stringify({
        timestamp,
        healthPercentage,
        totalChecks,
        passedChecks,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Health check error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
