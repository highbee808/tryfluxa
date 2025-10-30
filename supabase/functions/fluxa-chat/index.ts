import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

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
    console.log('📥 User message:', message)

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check for Lovable API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!lovableApiKey) {
      console.log('❌ LOVABLE_API_KEY not found')
      throw new Error('Service configuration error')
    }

    // Initialize Supabase client to search gists
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Try to find relevant gists based on the user's message
    console.log('🔍 Searching for relevant gists...')
    const { data: gists } = await supabase
      .from('gists')
      .select('headline, context, topic')
      .or(`headline.ilike.%${message}%,topic.ilike.%${message}%,context.ilike.%${message}%`)
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

    // Call Lovable AI for response
    console.log('🤖 Calling Lovable AI...')
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
            content: message
          }
        ],
      }),
    })

    console.log('📨 Lovable AI response status:', response.status)
    
    if (!response.ok) {
      const error = await response.text()
      console.log('❌ Lovable AI error:', response.status, error)
      
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

    console.log('✅ Lovable AI responded successfully')
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
