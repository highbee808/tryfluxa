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
    console.log('📰 Starting music news fetch...');

    const NEWSAPI_KEY = Deno.env.get('NEWSAPI_KEY');
    const MEDIASTACK_KEY = Deno.env.get('MEDIASTACK_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all music entities
    const { data: entities, error: fetchError } = await supabase
      .from('fan_entities')
      .select('*')
      .eq('category', 'music');

    if (fetchError) throw fetchError;

    console.log(`📊 Fetching news for ${entities?.length || 0} music entities`);

    let updated = 0;

    for (const entity of entities || []) {
      try {
        let articles: any[] = [];

        // Try NewsAPI first
        if (NEWSAPI_KEY) {
          const newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(entity.name + ' music')}&sortBy=publishedAt&pageSize=5&apiKey=${NEWSAPI_KEY}`;
          const newsResponse = await fetch(newsUrl);
          const newsData = await newsResponse.json();
          
          if (newsData.articles) {
            articles = newsData.articles.slice(0, 5).map((article: any) => ({
              title: article.title,
              url: article.url,
              image: article.urlToImage,
              published: article.publishedAt,
              source: article.source?.name || 'News'
            }));
          }
        }

        // Fallback to Mediastack if NewsAPI fails
        if (articles.length === 0 && MEDIASTACK_KEY) {
          const mediastackUrl = `http://api.mediastack.com/v1/news?access_key=${MEDIASTACK_KEY}&keywords=${encodeURIComponent(entity.name)}&categories=entertainment&limit=5`;
          const mediastackResponse = await fetch(mediastackUrl);
          const mediastackData = await mediastackResponse.json();
          
          if (mediastackData.data) {
            articles = mediastackData.data.slice(0, 5).map((article: any) => ({
              title: article.title,
              url: article.url,
              image: article.image,
              published: article.published_at,
              source: article.source || 'News'
            }));
          }
        }

        if (articles.length > 0) {
          const { error: updateError } = await supabase
            .from('fan_entities')
            .update({
              news_feed: articles,
              updated_at: new Date().toISOString()
            })
            .eq('id', entity.id);

          if (!updateError) {
            console.log(`✅ Updated news for ${entity.name}: ${articles.length} articles`);
            updated++;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`Error fetching news for ${entity.name}:`, err);
      }
    }

    console.log(`✅ Music news sync complete: ${updated} entities updated`);

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        message: `Music news synced for ${updated} artists`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-music-news:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
