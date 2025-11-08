import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🎙️ fluxa-chat started')
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { message, conversationHistory } = await req.json()
    console.log('📥 User message received')

    // Input validation
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate message length and content
    if (message.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 500 characters)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Sanitize message - remove potentially dangerous characters
    const sanitizedMessage = message.trim().replace(/[<>\"';()&+]/g, '')
    
    if (!sanitizedMessage) {
      return new Response(
        JSON.stringify({ error: 'Invalid message content' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check for OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured')
      throw new Error('Service configuration error')
    }

    // Initialize Supabase client to search gists
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Try to find relevant gists based on the user's message
    // Use safe search term - limit length and escape special characters
    const searchTerm = sanitizedMessage.substring(0, 100).replace(/[%_\\]/g, '\\$&')
    console.log('🔍 Searching for relevant gists...')
    const { data: gists } = await supabase
      .from('gists')
      .select('headline, context, topic')
      .or(`headline.ilike.*${searchTerm}*,topic.ilike.*${searchTerm}*,context.ilike.*${searchTerm}*`)
      .limit(3)

    let contextInfo = ''
    if (gists && gists.length > 0) {
      contextInfo = '\n\nRelevant gists I know about:\n' + 
        gists.map(g => `- ${g.headline}: ${g.context}`).join('\n')
      console.log('✅ Found', gists.length, 'relevant gists')
    }

    // Build conversation context
    let conversationContext = ''
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = '\n\nRecent conversation:\n' +
        conversationHistory.map((msg: any) => 
          `${msg.role === 'user' ? 'User' : 'Fluxa'}: ${msg.content}`
        ).join('\n')
    }

    // Call OpenAI gpt-4o-mini for response
    console.log('🤖 Calling OpenAI API...')
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
            content: `You are Fluxa, a charming and witty gossip companion who loves chatting about trending news, celebrities, pop culture, and entertainment.

Your personality:
- Playful, curious, and authentic
- Use emojis naturally (but not excessively)
- Keep replies under 80 words
- Be conversational and friendly, like texting with a bestie
- React with excitement, surprise, or humor when appropriate
- Use phrases like "Haha!", "OMG", "Wait...", "You heard about that?", "Let me spill it..."
- Never be formal or robotic

Keep your responses short, snappy, and engaging. You're here to gossip and have fun!${contextInfo}${conversationContext}`
          },
          {
            role: 'user',
            content: sanitizedMessage
          }
        ],
      }),
    })

    console.log('📨 OpenAI response status:', response.status)
    
    if (!response.ok) {
      const error = await response.text()
      console.log('❌ OpenAI error:', response.status, error)
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ reply: "Whoa bestie! I'm getting too many questions right now 😅 Give me a sec and try again!" }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ reply: "Oops! I need to recharge my gossip batteries 🔋 Try again in a bit!" }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      throw new Error(`Failed to get response from Fluxa`)
    }

    console.log('✅ OpenAI responded successfully')
    const data = await response.json()
    
    const reply = data.choices[0].message.content
    console.log('💬 Fluxa reply (first 100 chars):', reply.slice(0, 100))

    return new Response(
      JSON.stringify({ reply }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.log('❌ Error in fluxa-chat function:', error instanceof Error ? error.message : 'Unknown error')
    console.log('📚 Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return new Response(
      JSON.stringify({ 
        reply: "Oops! I got distracted for a sec 😅 Can you say that again?"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
