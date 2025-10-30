import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate current week range
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    console.log('Generating Fluxa Awards for week:', weekStart, 'to', weekEnd);

    // Check if awards already exist for this week
    const { data: existingAward } = await supabase
      .from('fluxa_awards')
      .select('*')
      .eq('week_start', weekStart.toISOString().split('T')[0])
      .single();

    if (existingAward) {
      return new Response(
        JSON.stringify({ 
          message: 'Awards already generated for this week',
          award: existingAward 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find Top Gister (user with most reactions sent)
    const { data: topGister } = await supabase
      .from('live_reactions')
      .select('user_id')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString());

    const gisterCounts = topGister?.reduce((acc: any, curr: any) => {
      acc[curr.user_id] = (acc[curr.user_id] || 0) + 1;
      return acc;
    }, {});

    const topGisterId = gisterCounts ? 
      Object.entries(gisterCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] : null;

    // Find Fluxa Fan (user with most story reactions)
    const { data: fluxaFan } = await supabase
      .from('story_reactions')
      .select('user_id')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString());

    const fanCounts = fluxaFan?.reduce((acc: any, curr: any) => {
      acc[curr.user_id] = (acc[curr.user_id] || 0) + 1;
      return acc;
    }, {});

    const fluxaFanId = fanCounts ? 
      Object.entries(fanCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] : null;

    // Find Hot Topic Room (room with most listeners)
    const { data: hotRoom } = await supabase
      .from('room_stats')
      .select('room_id, total_listeners')
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0])
      .order('total_listeners', { ascending: false })
      .limit(1)
      .single();

    // Create the award
    const { data: award, error } = await supabase
      .from('fluxa_awards')
      .insert([
        {
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
          top_gister_id: topGisterId,
          fluxa_fan_id: fluxaFanId,
          hot_topic_room_id: hotRoom?.room_id || null,
          announced: false,
        }
      ])
      .select()
      .single();

    if (error) throw error;

    console.log('Fluxa Awards generated:', award);

    return new Response(
      JSON.stringify({ 
        message: 'Fluxa Awards generated successfully',
        award 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating Fluxa Awards:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
