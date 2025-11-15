import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { postId, event } = await req.json()
    
    if (!postId || !event) {
      return new Response(
        JSON.stringify({ error: 'Missing postId or event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validEvents = ['view', 'play', 'share']
    if (!validEvents.includes(event)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Use atomic increment to prevent race conditions
    const columnMap: Record<string, string> = {
      view: 'views',
      play: 'plays',
      share: 'shares'
    }

    const column = columnMap[event]

    // Insert or update analytics atomically
    const { data, error } = await supabase.rpc('increment_post_analytics', {
      p_post_id: postId,
      p_column: column
    })

    if (error) {
      // Fallback to direct insert/update if RPC doesn't exist
      const { data: existing } = await supabase
        .from('post_analytics')
        .select('*')
        .eq('post_id', postId)
        .single()

      if (existing) {
        // Calculate new value
        const currentValue = existing[column as keyof typeof existing] as number || 0;
        const { error: updateError } = await supabase
          .from('post_analytics')
          .update({ 
            [column]: currentValue + 1,
            updated_at: new Date().toISOString()
          })
          .eq('post_id', postId)
      } else {
        await supabase
          .from('post_analytics')
          .insert({ 
            post_id: postId, 
            [column]: 1 
          })
      }
    }

    // Fetch updated analytics
    const { data: analytics } = await supabase
      .from('post_analytics')
      .select('*')
      .eq('post_id', postId)
      .single()

    return new Response(
      JSON.stringify({ success: true, analytics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error tracking event:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})