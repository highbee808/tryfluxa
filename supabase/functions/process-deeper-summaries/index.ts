import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Validate HMAC signature for CRON jobs
  const signature = req.headers.get('x-cron-signature')
  const cronSecret = Deno.env.get('CRON_SECRET')
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return new Response(
      JSON.stringify({ error: 'Unauthorized - CRON_SECRET not configured' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  if (!signature) {
    console.error('Missing x-cron-signature header')
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Missing signature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  const body = await req.text()
  const encoder = new TextEncoder()
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(cronSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body || '')
  )
  
  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)))
  
  if (signature !== expectedBase64) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid signature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch pending deeper summary requests
    const { data: requests, error: fetchError } = await supabase
      .from('deeper_summary_requests')
      .select(`
        id,
        user_id,
        gist_id,
        gists (
          headline,
          context,
          script,
          topic,
          source_url
        )
      `)
      .eq('status', 'pending')
      .limit(5)

    if (fetchError) throw fetchError

    console.log(`Processing ${requests?.length || 0} deeper summary requests`)

    for (const request of requests || []) {
      try {
        const gist = request.gists as any

        // Generate deeper summary using Lovable AI
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are Fluxa, an expert content analyst. Provide in-depth, comprehensive analysis that goes beyond surface-level summaries. Include:
- Detailed background context
- Multiple perspectives and viewpoints
- Historical context where relevant
- Potential implications and consequences
- Expert-level insights
- Data and evidence supporting the analysis
- Connection to broader trends

Keep it engaging yet thorough. Aim for 400-600 words.`
              },
              {
                role: 'user',
                content: `Create a deeper analysis of this topic:

Headline: ${gist.headline}
Summary: ${gist.context}
Full Content: ${gist.script}
Topic: ${gist.topic}
${gist.source_url ? `Source: ${gist.source_url}` : ''}`
              }
            ],
          }),
        })

        if (!response.ok) {
          throw new Error(`AI API error: ${response.status}`)
        }

        const aiData = await response.json()
        const deeperSummary = aiData.choices?.[0]?.message?.content

        if (!deeperSummary) {
          throw new Error('No summary generated')
        }

        // Update the request with the deeper summary
        const { error: updateError } = await supabase
          .from('deeper_summary_requests')
          .update({
            status: 'completed',
            deeper_summary: deeperSummary,
            completed_at: new Date().toISOString()
          })
          .eq('id', request.id)

        if (updateError) throw updateError

        // Send notification to user
        await supabase.from('notifications').insert({
          user_id: request.user_id,
          type: 'deeper_summary_ready',
          title: 'Your deeper summary is ready! 📚',
          message: `We've prepared an in-depth analysis of "${gist.headline.substring(0, 50)}..."`,
          gist_id: request.gist_id
        })

        console.log(`✅ Completed deeper summary for request ${request.id}`)

      } catch (error) {
        console.error(`Failed to process request ${request.id}:`, error)
        
        // Mark as failed
        await supabase
          .from('deeper_summary_requests')
          .update({ status: 'failed' })
          .eq('id', request.id)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: requests?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
