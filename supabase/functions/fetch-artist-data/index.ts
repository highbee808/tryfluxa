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
    console.log('🎵 Starting artist data fetch from Last.fm...');

    const LASTFM_API_KEY = Deno.env.get('LAST_FM_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!LASTFM_API_KEY) {
      throw new Error('Last.fm API key not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all music entities
    const { data: entities, error: fetchError } = await supabase
      .from('fan_entities')
      .select('*')
      .eq('category', 'music');

    if (fetchError) {
      console.error('Error fetching entities:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${entities?.length || 0} music entities to update`);

    let updated = 0;
    let errors = 0;

    for (const entity of entities || []) {
      try {
        // Use API name from stats if available, otherwise use entity name
        const artistName = entity.stats?.api_name || entity.name
        
        console.log(`🎵 Fetching data for ${entity.name} using API name: ${artistName}`)
        
        // Fetch artist info from Last.fm
        const artistInfoUrl = `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`;
        
        const infoResponse = await fetch(artistInfoUrl);
        const infoData = await infoResponse.json();

        if (infoData.error) {
          console.warn(`⚠️ Artist not found: ${entity.name} (API name: ${artistName}) - possible name mismatch`);
          continue;
        }

        const artist = infoData.artist;

        // Fetch top albums using the same artist name
        const albumsUrl = `http://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json&limit=3`;
        const albumsResponse = await fetch(albumsUrl);
        const albumsData = await albumsResponse.json();

        const upcomingEvents = (albumsData.topalbums?.album || []).slice(0, 3).map((album: any) => ({
          title: `${album.name} Album`,
          date: 'TBA',
          venue: 'Available on all platforms'
        }));

        // Update entity with fresh data
        const { error: updateError } = await supabase
          .from('fan_entities')
          .update({
            bio: artist.bio?.summary?.replace(/<[^>]*>/g, '').substring(0, 300) || entity.bio,
            background_url: artist.image?.find((img: any) => img.size === 'mega')?.['#text'] || entity.background_url,
            stats: {
              ...entity.stats,
              listeners: artist.stats?.listeners || '0',
              playcount: artist.stats?.playcount || '0',
              similar_artists: artist.similar?.artist?.slice(0, 3).map((a: any) => a.name) || []
            },
            upcoming_events: upcomingEvents,
            updated_at: new Date().toISOString()
          })
          .eq('id', entity.id);

        if (updateError) {
          console.error(`Error updating ${entity.name}:`, updateError);
          errors++;
        } else {
          console.log(`✅ Updated ${entity.name}`);
          updated++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));

      } catch (err) {
        console.error(`Error processing ${entity.name}:`, err);
        errors++;
      }
    }

    console.log(`✅ Artist data sync complete: ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        errors,
        message: `Artist data synced successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-artist-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
