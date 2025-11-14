import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QualityMetrics {
  coherence_score: number
  accuracy_score: number
  conciseness_score: number
  overall_score: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { gist_id, provider, summary, original_content } = await req.json()

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Use AI to evaluate summary quality
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
            content: `You are a summary quality evaluator. Assess summaries on three dimensions:
1. Coherence (0-1): How well-structured and logically flowing is the summary?
2. Accuracy (0-1): How well does it capture the key points of the original?
3. Conciseness (0-1): How efficiently does it convey information without unnecessary words?

Return ONLY a JSON object with these scores and an overall_score (average of the three).
Format: {"coherence_score": 0.X, "accuracy_score": 0.X, "conciseness_score": 0.X, "overall_score": 0.X}`
          },
          {
            role: 'user',
            content: `Evaluate this summary:

Original Content: ${original_content}

Summary: ${summary}

Provider: ${provider}`
          }
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const aiData = await response.json()
    const evaluationText = aiData.choices?.[0]?.message?.content

    // Parse the JSON scores from the response
    const jsonMatch = evaluationText.match(/\{[^}]+\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse quality scores')
    }

    const metrics: QualityMetrics = JSON.parse(jsonMatch[0])

    // Store quality score in database
    const { error: insertError } = await supabase
      .from('summary_quality_scores')
      .insert({
        gist_id,
        provider,
        coherence_score: metrics.coherence_score,
        accuracy_score: metrics.accuracy_score,
        conciseness_score: metrics.conciseness_score,
        overall_score: metrics.overall_score,
      })

    if (insertError) throw insertError

    console.log(`✅ Quality evaluated for gist ${gist_id}: ${metrics.overall_score.toFixed(2)}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        metrics
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
