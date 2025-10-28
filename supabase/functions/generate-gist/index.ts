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
    const { topic } = await req.json()

    if (!topic) {
      throw new Error('Topic is required')
    }

    console.log('Generating gist for topic:', topic)

    // Use Lovable AI to generate gist content
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a charismatic news companion AI that creates engaging, conversational news summaries called "gists". 
Your tone is friendly, slightly gossipy, and entertaining while staying factual.
You must return a JSON object with three fields:
- headline: A catchy, emoji-enhanced headline (max 80 chars)
- context: A brief, engaging summary (max 200 chars) 
- script: A full conversational narration (200-300 words) that sounds natural when spoken aloud

Make the script feel like you're chatting with a friend over coffee, not reading a news article.`
          },
          {
            role: 'user',
            content: `Create a gist about: ${topic}`
          }
        ],
        response_format: { type: 'json_object' }
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Lovable AI error:', response.status, error)
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.')
      }
      
      throw new Error(`Failed to generate gist: ${error}`)
    }

    const data = await response.json()
    const content = JSON.parse(data.choices[0].message.content)

    console.log('Gist generated successfully')

    return new Response(
      JSON.stringify({
        headline: content.headline,
        context: content.context,
        script: content.script,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in generate-gist function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
