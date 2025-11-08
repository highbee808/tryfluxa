import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

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
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      console.error('[CONFIG] Missing OPENAI_API_KEY')
      throw new Error('Service configuration error')
    }

    // Detect if topic is about a celebrity or public figure
    const isCelebrity = /drake|taylor swift|messi|rihanna|beyonce|kanye|cristiano|ronaldo|lebron|kim kardashian|ariana grande|justin bieber|selena gomez|bad bunny|dua lipa/i.test(topic)
    console.log('👤 Celebrity detected:', isCelebrity)

    // Get current date for context
    const currentDate = new Date().toISOString().split('T')[0]
    const currentTime = new Date().toLocaleString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
    console.log('📅 Current date:', currentDate, '/', currentTime)

    // Use OpenAI gpt-4o-mini for more current and accurate news
    console.log('🤖 Calling OpenAI API (gpt-4o-mini)...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Fluxa, a witty gossip companion who creates engaging content about trending topics.
Today's date is ${currentTime}.

IMPORTANT: Even if you don't have breaking news from the last 24 hours, create engaging, plausible content about the topic.
For sports teams, discuss their current season, recent form, or upcoming matches.
For celebrities/artists, discuss their current projects, tour dates, or recent social media activity.

CRITICAL CONTEXT RULES:
- When topic mentions sports teams (e.g., "Barcelona", "Real Madrid"), interpret as THE SPORTS TEAM, not the city
- When topic mentions artists (e.g., "Lamine Yamal", "Drake"), focus on their career/performance
- Create realistic, engaging content even without access to real-time news
- NEVER say "I can't pull live headlines" or similar disclaimers
- Be confident and create plausible, exciting gist content

Your tone is playful, positive, expressive, and globally understandable.
You must return valid JSON with these exact fields:
{
  "headline": "catchy emoji-enhanced headline (max 80 chars)",
  "context": "brief engaging summary (max 200 chars) - NO disclaimers about lack of real-time data",
  "narration": "40-60 second conversational script with occasional 'Haha!' and mention 'Fluxa' once naturally",
  "image_keyword": "descriptive 2-4 word phrase for image search"
}

Rules:
- Keep it playful, positive, short, and globally understandable
- Create exciting, plausible content about the topic
- No accusations, sensitive info, or real names in negative contexts
- Narration length: conversational, 40-60 seconds when spoken
- Add laughs like "Haha!" occasionally
- Include "Fluxa" naturally in narration once
- image_keyword should be visually descriptive and specific`
          },
          {
            role: 'user',
            content: `Create an engaging gist about: ${topic}. Make it exciting and plausible, focusing on their current season/projects/activity. Be confident and specific.`
          }
        ],
        response_format: { type: 'json_object' }
      }),
    })

    console.log('📨 AI response status:', response.status)
    
    if (!response.ok) {
      console.error('[AI] Generation failed:', response.status)
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded')
      }
      if (response.status === 402) {
        throw new Error('Service credits exhausted')
      }
      
      throw new Error('Content generation failed')
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

    // Generate image using OpenAI DALL-E for all topics
    let generatedImageUrl = null
    console.log('🧠 Fluxa is creating a custom image for topic...')
    try {
      const imagePrompt = `High-quality realistic ${isCelebrity ? 'portrait style' : 'editorial style'} image of ${content.image_keyword || topic}, cinematic lighting, magazine cover aesthetic, professional photography, vibrant colors`
      console.log('🎨 Image prompt:', imagePrompt)
      
      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: imagePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          response_format: 'url'
        }),
      })

      if (imageResponse.ok) {
        const imageData = await imageResponse.json()
        const imageUrl = imageData.data?.[0]?.url
        if (imageUrl) {
          generatedImageUrl = imageUrl
          console.log('🧠 Fluxa created a custom image:', imageUrl)
        } else {
          console.log('⚠️ No image URL in response')
        }
      } else {
        const error = await imageResponse.text()
        console.log('⚠️ Fluxa image generation failed:', imageResponse.status, error)
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
    console.error('[ERROR] generate-gist failed:', error)
    
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
