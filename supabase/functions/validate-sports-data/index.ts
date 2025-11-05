import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting sports data cross-validation...');

    const THESPORTSDB_API_KEY = Deno.env.get('THESPORTSDB_API_KEY');
    const SPORTSDATA_API_KEY = Deno.env.get('SPORTSDATA_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all sports entities
    const { data: entities, error: fetchError } = await supabase
      .from('fan_entities')
      .select('*')
      .eq('category', 'sports');

    if (fetchError) throw fetchError;

    console.log(`📊 Validating ${entities?.length || 0} sports entities`);

    let validated = 0;
    let mismatches = 0;
    let corrected = 0;

    for (const entity of entities || []) {
      try {
        // Skip NBA teams for TheSportsDB validation (they don't have good NBA coverage)
        if (entity.stats?.league === 'NBA') {
          validated++;
          continue;
        }

        // Fetch from TheSportsDB to cross-validate
        const teamSearchUrl = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}/searchteams.php?t=${encodeURIComponent(entity.name)}`;
        const teamResponse = await fetch(teamSearchUrl);
        const teamData = await teamResponse.json();

        if (teamData.teams && teamData.teams.length > 0) {
          const theSportsDbTeam = teamData.teams[0];
          
          // Validate league matches
          const currentLeague = entity.stats?.league;
          const theSportsDbLeague = theSportsDbTeam.strLeague;

          if (currentLeague && theSportsDbLeague && !theSportsDbLeague.includes(currentLeague) && !currentLeague.includes(theSportsDbLeague)) {
            console.log(`⚠️ League mismatch for ${entity.name}: ${currentLeague} vs ${theSportsDbLeague}`);
            mismatches++;

            // Log the mismatch
            await supabase.from('data_monitor_log').insert({
              entity_id: entity.id,
              entity_name: entity.name,
              check_type: 'cross_validation',
              issue_type: 'league_mismatch',
              severity: 'warning',
              issue_description: `League mismatch detected: ${currentLeague} vs ${theSportsDbLeague}`,
              action_taken: 'logged_for_review',
              before_data: { league: currentLeague },
              after_data: { league: theSportsDbLeague }
            });
          }

          // Validate and update logo if missing or low quality
          if (!entity.logo_url && theSportsDbTeam.strTeamBadge) {
            await supabase
              .from('fan_entities')
              .update({
                logo_url: theSportsDbTeam.strTeamBadge,
                updated_at: new Date().toISOString()
              })
              .eq('id', entity.id);

            console.log(`✅ Updated logo for ${entity.name}`);
            corrected++;
          }

          // Validate and update background if missing
          if (!entity.background_url && theSportsDbTeam.strStadiumThumb) {
            await supabase
              .from('fan_entities')
              .update({
                background_url: theSportsDbTeam.strStadiumThumb,
                updated_at: new Date().toISOString()
              })
              .eq('id', entity.id);

            console.log(`✅ Updated background for ${entity.name}`);
            corrected++;
          }

          validated++;
        }

        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (err) {
        console.error(`Error validating ${entity.name}:`, err);
      }
    }

    console.log(`✅ Validation complete: ${validated} validated, ${mismatches} mismatches, ${corrected} corrected`);

    return new Response(
      JSON.stringify({
        success: true,
        validated,
        mismatches,
        corrected,
        message: `Sports data validation complete`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-sports-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
