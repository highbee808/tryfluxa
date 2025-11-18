import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, serviceKey)

const requestSchema = z.object({
  gistId: z.string().uuid(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { gistId } = requestSchema.parse(body)

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('Service configuration error')
    }

    const { data: gist, error } = await supabase
      .from('gists')
      .select('id, headline, context, script, topic, meta, audio_cache_url, audio_url')
      .eq('id', gistId)
      .single()

    if (error || !gist) {
      return new Response(
        JSON.stringify({ error: 'Gist not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const existingExplanation = typeof (gist.meta as Record<string, unknown> | null)?.explanation_cache === 'string'
      ? (gist.meta as Record<string, unknown>).explanation_cache as string
      : null

    const cachedAudioUrl = gist.audio_cache_url || gist.audio_url
    if (cachedAudioUrl && existingExplanation) {
      return new Response(
        JSON.stringify({ audioUrl: cachedAudioUrl, explanation: existingExplanation, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const baseSummary = gist.script || gist.context
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Fluxa, an energetic gossip companion who delivers on-demand deep dives when a user taps Play. Expand the provided summary with clear takeaways and zero links.'
          },
          {
            role: 'user',
            content: `Headline: ${gist.headline}\nTopic: ${gist.topic}\nSummary: ${baseSummary}\n\nWrite a 3 paragraph spoken explainer (max 220 words) with one playful Fluxa-branded line. Return JSON: {"explanation":"text"}`
          }
        ],
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      console.error('Explanation generation failed:', await response.text())
      throw new Error('Failed to generate explanation')
    }

    const payload = await response.json()
    let explanation = ''
    try {
      const parsed = JSON.parse(payload.choices?.[0]?.message?.content || '{}')
      explanation = typeof parsed.explanation === 'string' && parsed.explanation.trim()
        ? parsed.explanation.trim()
        : baseSummary
    } catch (_err) {
      explanation = baseSummary
    }

    const { data: ttsData, error: ttsError } = await supabase.functions.invoke('text-to-speech', {
      body: { text: explanation, voice: 'shimmer', speed: 0.94 }
    })

    if (ttsError || !ttsData?.audioUrl) {
      throw new Error('Audio synthesis failed')
    }

    const audioUrl = ttsData.audioUrl as string
    const nextMeta = { ...(gist.meta as Record<string, unknown> | null ?? {}), explanation_cache: explanation }

    const { error: updateError } = await supabase
      .from('gists')
      .update({ audio_url: audioUrl, audio_cache_url: audioUrl, meta: nextMeta })
      .eq('id', gistId)

    if (updateError) {
      console.error('Failed to persist audio cache', updateError)
    }

    if (gist.topic) {
      const { data: cacheRow } = await supabase
        .from('news_cache')
        .select('id, audio_cache')
        .eq('entity', gist.topic)
        .order('cached_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cacheRow?.id) {
        const existingAudioCache = (cacheRow.audio_cache as Record<string, string> | null) ?? {}
        existingAudioCache[gistId] = audioUrl
        await supabase
          .from('news_cache')
          .update({ audio_cache: existingAudioCache })
          .eq('id', cacheRow.id)
      }
    }

    return new Response(
      JSON.stringify({ audioUrl, explanation, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('request-gist-audio error:', error)
    return new Response(
      JSON.stringify({ error: 'Unable to generate audio' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
