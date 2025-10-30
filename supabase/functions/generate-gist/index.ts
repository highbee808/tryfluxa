import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 generate-gist started')
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('📦 Request body:', JSON.stringify(body))
    
    const { topic } = body

    if (!topic) {
      console.log('❌ No topic provided')
      throw new Error('Topic is required')
    }

    console.log('📝 Generating gist for topic:', topic)
    
    // Check API key
    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) {
      console.log('❌ LOVABLE_API_KEY not found')
      throw new Error('LOVABLE_API_KEY not configured')
    }
    console.log('✅ LOVABLE_API_KEY found')

    // Use Lovable AI to generate gist content
    console.log('🤖 Calling Lovable AI...')
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
            content: `You are Fluxa, a witty gossip companion who explains trends like a friend chatting.
Your tone is playful, positive, and globally understandable.
You must return valid JSON with these exact fields:
{
  "headline": "catchy emoji-enhanced headline (max 80 chars)",
  "context": "brief engaging summary (max 200 chars)",
  "narration": "40-60 second conversational script with occasional 'Haha!' and mention 'Fluxa' once naturally",
  "suggested_image": "single keyword for image search"
}

Rules:
- Keep it playful, positive, short, and globally understandable
- No accusations, sensitive info, or real names in negative contexts
- Narration length: conversational, 40-60 seconds when spoken
- Add laughs like "Haha!" occasionally
- Include "Fluxa" naturally in narration once`
          },
          {
            role: 'user',
            content: `Create a gist about: ${topic}`
          }
        ],
        response_format: { type: 'json_object' }
      }),
    })

    console.log('📨 AI response status:', response.status)
    
    if (!response.ok) {
      const error = await response.text()
      console.log('❌ Lovable AI error:', response.status, error)
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.')
      }
      
      throw new Error(`Failed to generate gist: ${error}`)
    }

    console.log('✅ AI responded successfully')
    const data = await response.json()
    console.log('📄 AI raw response:', JSON.stringify(data))
    
    const content = JSON.parse(data.choices[0].message.content)
    console.log('✅ Gist content parsed:', JSON.stringify(content))

    return new Response(
      JSON.stringify({
        headline: content.headline,
        context: content.context,
        narration: content.narration,
        suggested_image: content.suggested_image || 'trending news',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.log('❌ Error in generate-gist function:', error instanceof Error ? error.message : 'Unknown error')
    console.log('📚 Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
