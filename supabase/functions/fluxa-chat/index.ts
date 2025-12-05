import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, createErrorResponse, parseBody } from '../_shared/http.ts'
import { ENV } from '../_shared/env.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

serve(async (req) => {
  console.log('🎙️ fluxa-chat started')

  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled')
    return new Response("OK", { headers: corsHeaders })
  }

  try {
    const { message, conversationHistory } = await parseBody(req)
    console.log('📥 Message received')

    // Input validation
    if (!message || typeof message !== 'string') {
      return createErrorResponse('Message is required', 400)
    }

    // Trim the message
    const trimmedMessage = message.trim()

    if (!trimmedMessage) {
      return createErrorResponse('Message cannot be empty', 400)
    }

    // Get user ID from auth header
    const authHeader = req.headers.get('authorization')
    let userId: string | null = null
    let userPersonality: any = null

    if (authHeader) {
      try {
        const supabase = createClient(
          ENV.VITE_SUPABASE_URL,
          ENV.VITE_SUPABASE_ANON_KEY,
          { global: { headers: { Authorization: authHeader } } }
        )
        
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          userId = user.id
          
          // Fetch user's Fluxa Brain data for personalization
          const { data: brainData } = await supabase
            .from('fluxa_brain')
            .select('preferred_tone, topics_read, total_reads, engagement_score')
            .eq('user_id', userId)
            .maybeSingle()
          
          if (brainData) {
            userPersonality = brainData
            console.log('🧠 Found user personality data:', {
              tone: brainData.preferred_tone,
              reads: brainData.total_reads,
              engagement: brainData.engagement_score
            })
          }
        }
      } catch (authError) {
        console.warn('Could not fetch user personality:', authError)
      }
    }

    // Check for OpenAI API key
    const openaiApiKey = ENV.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured')
      return createErrorResponse('Service configuration error', 500)
    }

    // Build personalized system prompt
    const toneDescriptions: Record<string, string> = {
      casual: "You're chatting with a close friend. Use casual language, emojis occasionally, and be warm and relatable. Share your thoughts naturally, like you're catching up over coffee.",
      concise: "You're texting a busy friend. Keep it short, punchy, and to the point. No fluff, just the essentials with a friendly vibe.",
      analytical: "You're discussing with a thoughtful friend who appreciates depth. Be insightful but still conversational, like explaining something interesting to someone you respect."
    }

    const preferredTone = userPersonality?.preferred_tone || 'casual'
    const toneGuidance = toneDescriptions[preferredTone] || toneDescriptions.casual
    
    // Build conversation context
    const conversationContext = conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? conversationHistory.slice(-5).map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      : []

    // Personalized system message
    const systemMessage = `You are Fluxa, a Gen-Z bestie who keeps it real with the latest tea. You're witty, playful, and always in the know.

${toneGuidance}

Important guidelines:
- Talk like you're gisting a friend, not presenting to an audience
- Use natural, conversational language
- Be authentic and relatable
- Keep responses under 80 words
- Match the user's energy and vibe
- Reference past conversations if relevant
- If the user repeats themselves, acknowledge it once and move the convo forward with new info or a fresh angle
- Be warm, friendly, and genuine

${userPersonality?.total_reads > 10 ? `This user has been around for a while (${userPersonality.total_reads} reads), so you can be more familiar and reference shared context.` : ''}`

    // Call OpenAI gpt-4o-mini for response
    console.log('🤖 Calling OpenAI API with personalized prompt...')
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
            content: systemMessage
          },
          ...conversationContext,
          {
            role: 'user',
            content: trimmedMessage
          }
        ],
        temperature: 0.8, // Higher temperature for more natural, varied responses
      }),
    })

    console.log('📨 OpenAI response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ OpenAI error:', response.status, errorText)

      return new Response(
        JSON.stringify({
          error: 'Failed to get response from Fluxa',
          details: `${response.status}: ${errorText}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    console.log('✅ OpenAI responded successfully')
    const data = await response.json()

    const reply = data.choices?.[0]?.message?.content
    if (!reply) {
      console.error('❌ No reply in OpenAI response')
      return new Response(
        JSON.stringify({
          error: 'No reply generated',
          details: 'OpenAI response missing content'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    console.log('💬 Fluxa reply (first 100 chars):', reply.slice(0, 100))

    return new Response(
      JSON.stringify({ reply }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('❌ Error in fluxa-chat function:', error instanceof Error ? error.message : 'Unknown error')
    console.error('📚 Error stack:', error instanceof Error ? error.stack : 'No stack')

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
