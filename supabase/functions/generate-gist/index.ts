import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const topicSchema = z.object({
  topic: z.string()
    .trim()
    .min(1, 'Topic is required')
    .max(500, 'Topic too long (max 500 characters)')
    .regex(/^[a-zA-Z0-9\s.,!?'"@#$%&*()\-+=_\[\]{}:;/\\<>|~`]+$/, 'Topic contains invalid characters')
})

serve(async (req) => {
  console.log('🚀 generate-gist started')
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 generate-gist started')
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('📦 Request body keys:', Object.keys(body))
    
    // Validate input
    console.log('📝 Validating input...')
    let validated
    try {
      validated = topicSchema.parse(body)
    } catch (validationError: any) {
      console.log('❌ Validation failed:', validationError.message)
      return new Response(
        JSON.stringify({ error: 'Invalid input provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    const { topic } = validated

    console.log('📝 Topic received:', topic)
    console.log('📏 Topic length:', topic.length, 'chars')
    
    // Check API key
    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) {
      console.log('❌ LOVABLE_API_KEY not found')
      throw new Error('Service configuration error')
    }
    console.log('✅ LOVABLE_API_KEY found')

    // Detect if topic is about a celebrity or public figure
    const isCelebrity = /drake|taylor swift|messi|rihanna|beyonce|kanye|cristiano|ronaldo|lebron|kim kardashian|ariana grande|justin bieber|selena gomez|bad bunny|dua lipa/i.test(topic)
    console.log('👤 Celebrity detected:', isCelebrity)

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
            content: `You are Fluxa, a witty gossip companion who explains trends like a friend chatting—not an AI system.
Your tone is playful, positive, expressive, and globally understandable.
You must return valid JSON with these exact fields:
{
  "headline": "catchy emoji-enhanced headline (max 80 chars)",
  "context": "brief engaging summary (max 200 chars)",
  "narration": "40-60 second conversational script with occasional 'Haha!' and mention 'Fluxa' once naturally",
  "image_keyword": "descriptive 2-4 word phrase for image search"
}

Rules:
- Keep it playful, positive, short, and globally understandable
- No accusations, sensitive info, or real names in negative contexts
- Narration length: conversational, 40-60 seconds when spoken
- Add laughs like "Haha!" occasionally
- Include "Fluxa" naturally in narration once
- image_keyword should be visually descriptive (e.g., "Drake concert performance", "Messi football celebration", "tech product launch")`
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
    console.log('📄 AI response structure:', Object.keys(data))
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.log('❌ Invalid AI response structure')
      throw new Error('Invalid response from AI')
    }
    
    const messageContent = data.choices[0].message.content
    console.log('📝 AI message content (first 200 chars):', messageContent.slice(0, 200))
    
    let content
    try {
      content = JSON.parse(messageContent)
      console.log('✅ Gist content parsed successfully')
      console.log('📋 Content keys:', Object.keys(content))
    } catch (parseError) {
      console.log('❌ Failed to parse AI response as JSON:', parseError)
      throw new Error('AI returned invalid JSON')
    }

    // Generate image using Lovable AI for all topics
    let generatedImageUrl = null
    console.log('🧠 Fluxa is creating a custom image for topic...')
    try {
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
      if (!lovableApiKey) {
        console.log('⚠️ LOVABLE_API_KEY not found, falling back to stock images')
      } else {
        const imagePrompt = `High-quality realistic ${isCelebrity ? 'portrait style' : 'editorial style'} image of ${content.image_keyword || topic}, cinematic lighting, magazine cover aesthetic, professional photography, vibrant colors`
        console.log('🎨 Image prompt:', imagePrompt)
        
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: imagePrompt
              }
            ],
            modalities: ['image', 'text']
          }),
        })

        if (imageResponse.ok) {
          const imageData = await imageResponse.json()
          const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url
          if (base64Image) {
            generatedImageUrl = base64Image
            console.log('🧠 Fluxa created a custom image (base64 length:', base64Image.length, ')')
          } else {
            console.log('⚠️ No image data in response')
          }
        } else {
          const error = await imageResponse.text()
          console.log('⚠️ Fluxa image generation failed:', imageResponse.status, error)
        }
      }
    } catch (error) {
      console.log('⚠️ Error generating custom image:', error instanceof Error ? error.message : 'Unknown error')
    }

    return new Response(
      JSON.stringify({
        headline: content.headline,
        context: content.context,
        narration: content.narration,
        image_keyword: content.image_keyword || 'trending news',
        ai_generated_image: generatedImageUrl,
        is_celebrity: isCelebrity,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.log('❌ Error in generate-gist function:', error instanceof Error ? error.message : 'Unknown error')
    console.log('📚 Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
