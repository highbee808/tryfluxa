<#
Fluxa Backend Auto-Refactor + Deploy Script (PowerShell)
-------------------------------------------------------
✔ Updates backend function files (Option A folder structure)
✔ Removes audio/TTS stage from publish-gist
✔ External APIs first → OpenAI last in generators
✔ Deploys functions via Supabase CLI
#>

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Fluxa backend update & Supabase deployment..." -ForegroundColor Cyan

$root = Get-Location
$funcPath = Join-Path $root "supabase/functions"

function Write-FunctionFile {
    param (
        [string]$RelativePath,
        [string]$Content
    )

    $fullPath = Join-Path $funcPath $RelativePath
    $dir = Split-Path $fullPath -Parent

    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    Write-Host "📝 Updating $RelativePath..." -ForegroundColor Yellow
    Set-Content -Path $fullPath -Value $Content -Encoding UTF8
}

# -------------------------------------------------------
# 1) publish-gist/index.ts  (AUDIO REMOVED)
# -------------------------------------------------------
$publishGist = @'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const sentSecret = req.headers.get("x-cron-secret");
    if (cronSecret && sentSecret !== cronSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const topic = body?.topic?.trim();
    const imageUrl = body?.imageUrl || null;
    const topicCategory = body?.topicCategory || "Trending";
    const sourceUrl = body?.sourceUrl || null;
    const newsPublishedAt = body?.newsPublishedAt || null;

    if (!topic) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing topic" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey =
      Deno.env.get("SB_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    const missingVars = [];
    if (!supabaseUrl) missingVars.push("SUPABASE_URL");
    if (!serviceKey) missingVars.push("SB_SERVICE_ROLE_KEY");
    if (!anonKey) missingVars.push("SUPABASE_ANON_KEY");
    if (!openaiApiKey) missingVars.push("OPENAI_API_KEY");

    if (missingVars.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Service configuration error",
          missing: missingVars,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
    });

    // Step 1: Generate gist content (external-first inside generate-gist)
    console.log("📝 Step 1/3: Generating gist content...");
    const generateResponse = await supabase.functions.invoke("generate-gist", {
      body: { topic, topicCategory, sourceUrl, newsPublishedAt },
      headers: { Authorization: `Bearer ${serviceKey}` },
    });

    if (generateResponse.error) {
      console.error("[PIPELINE] generate-gist failed:", generateResponse.error);
      throw new Error(`Content generation failed: ${generateResponse.error.message}`);
    }
    if (!generateResponse.data) {
      throw new Error("Content generation returned no data");
    }

    const {
      headline,
      context,
      narration,
      image_keyword,
      ai_generated_image,
      is_celebrity,
      source_url,
      source_title,
      source_excerpt,
      used_api_article,
      imageUrl: generatedImageUrl,
    } = generateResponse.data;

    console.log("✅ Gist content generated.");

    // Step 2: Image handling
    console.log("🖼️ Step 2/3: Resolving image...");
    let finalImageUrl: string | null = null;

    if (ai_generated_image && generatedImageUrl) {
      finalImageUrl = generatedImageUrl;
      console.log("🖼️ Using AI-generated image from generator.");
    } else if (imageUrl) {
      finalImageUrl = imageUrl;
      console.log("🖼️ Using provided imageUrl.");
    } else {
      finalImageUrl =
        "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1400&auto=format&fit=crop";
      console.log("🖼️ Using fallback image.");
    }

    // Step 3: Insert gist into DB (NO AUDIO FIELDS)
    console.log("💾 Step 3/3: Inserting gist into DB...");
    const insertPayload: Record<string, unknown> = {
      topic,
      category: topicCategory,
      headline,
      context,
      narration,
      script: narration,
      image_keyword,
      image_url: finalImageUrl,
      is_celebrity: !!is_celebrity,
      source_url: source_url || sourceUrl,
      source_title: source_title || null,
      source_excerpt: source_excerpt || null,
      used_api_article: !!used_api_article,
      ai_generated_image: !!ai_generated_image,
      news_published_at: newsPublishedAt || null,
      created_at: new Date().toISOString(),
    };

    const { data: gist, error: insertError } = await supabase
      .from("gists")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("[PIPELINE] DB insert failed:", insertError);
      throw insertError;
    }

    console.log("✅ Gist published:", gist?.id);

    return new Response(
      JSON.stringify({ success: true, gist }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[PIPELINE] Fatal error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
'@

Write-FunctionFile "publish-gist/index.ts" $publishGist


# -------------------------------------------------------
# 2) generate-gist/index.ts  (EXTERNAL FIRST)
# -------------------------------------------------------
$generateGist = @'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ExternalItem = {
  title: string;
  description?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
};

async function fetchNewsExternal(topic: string): Promise<ExternalItem[]> {
  const items: ExternalItem[] = [];

  const newsApiKey = Deno.env.get("NEWSAPI_KEY");
  if (newsApiKey) {
    try {
      const r = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(
          topic
        )}&pageSize=5&sortBy=publishedAt&language=en`,
        { headers: { "X-Api-Key": newsApiKey } }
      );
      if (r.ok) {
        const j = await r.json();
        for (const a of j.articles ?? []) {
          items.push({
            title: a.title,
            description: a.description,
            url: a.url,
            source: a.source?.name,
            publishedAt: a.publishedAt,
          });
        }
      }
    } catch (_) {}
  }

  const guardianKey = Deno.env.get("GUARDIAN_API_KEY");
  if (guardianKey) {
    try {
      const r = await fetch(
        `https://content.guardianapis.com/search?q=${encodeURIComponent(
          topic
        )}&page-size=5&show-fields=trailText&api-key=${guardianKey}`
      );
      if (r.ok) {
        const j = await r.json();
        for (const a of j.response?.results ?? []) {
          items.push({
            title: a.webTitle,
            description: a.fields?.trailText,
            url: a.webUrl,
            source: "The Guardian",
            publishedAt: a.webPublicationDate,
          });
        }
      }
    } catch (_) {}
  }

  const mediaStackKey = Deno.env.get("MEDIASTACK_KEY");
  if (mediaStackKey) {
    try {
      const r = await fetch(
        `http://api.mediastack.com/v1/news?access_key=${mediaStackKey}&keywords=${encodeURIComponent(
          topic
        )}&limit=5&languages=en`
      );
      if (r.ok) {
        const j = await r.json();
        for (const a of j.data ?? []) {
          items.push({
            title: a.title,
            description: a.description,
            url: a.url,
            source: a.source,
            publishedAt: a.published_at,
          });
        }
      }
    } catch (_) {}
  }

  return items.slice(0, 5);
}

async function openaiChat(messages: any[], model = "gpt-4o-mini") {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenAI error: ${t}`);
  }
  return r.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { topic, topicCategory = "Trending" } = await req.json();
    if (!topic)
      return new Response(
        JSON.stringify({ success: false, error: "Missing topic" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    const externals =
      topicCategory === "Sports"
        ? []
        : await fetchNewsExternal(topic);

    const externalAvailable = externals.length > 0;

    let headline = "";
    let context = "";
    let narration = "";
    let image_keyword = "";
    let used_api_article = false;
    let source_url: string | null = null;
    let source_title: string | null = null;
    let source_excerpt: string | null = null;

    if (externalAvailable) {
      used_api_article = true;

      const pack = externals
        .map((x, i) => `(${i + 1}) ${x.title}\n${x.description ?? ""}\n${x.url ?? ""}`)
        .join("\n\n");

      const completion = await openaiChat(
        [
          {
            role: "system",
            content:
              "You are Fluxa. Turn real articles into a short, punchy gist. Output JSON with keys: headline, context, narration, image_keyword, source_title, source_url, source_excerpt, is_celebrity.",
          },
          { role: "user", content: pack },
        ],
        "gpt-4o-mini"
      );

      const text = completion.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text);

      headline = parsed.headline ?? externals[0].title;
      context = parsed.context ?? "";
      narration = parsed.narration ?? "";
      image_keyword = parsed.image_keyword ?? topic;
      source_title = parsed.source_title ?? externals[0].title;
      source_url = parsed.source_url ?? externals[0].url ?? null;
      source_excerpt = parsed.source_excerpt ?? externals[0].description ?? null;
    } else {
      const completion = await openaiChat(
        [
          {
            role: "system",
            content:
              "You are Fluxa. Generate a fresh trending gist when no external sources are available. Output JSON with keys: headline, context, narration, image_keyword, is_celebrity.",
          },
          { role: "user", content: topic },
        ],
        "gpt-5"
      );

      const text = completion.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text);

      headline = parsed.headline ?? topic;
      context = parsed.context ?? "";
      narration = parsed.narration ?? "";
      image_keyword = parsed.image_keyword ?? topic;
    }

    return new Response(
      JSON.stringify({
        headline,
        context,
        narration,
        image_keyword,
        ai_generated_image: true,
        is_celebrity: false,
        source_url,
        source_title,
        source_excerpt,
        used_api_article,
        imageUrl: null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
'@

Write-FunctionFile "generate-gist/index.ts" $generateGist


# -------------------------------------------------------
# 3) generate-stories/index.ts
# -------------------------------------------------------
$generateStories = @'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function openaiChat(messages: any[], model = "gpt-4o-mini") {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, temperature: 0.9, messages }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { topic, externalPack } = await req.json();

    if (externalPack) {
      const completion = await openaiChat(
        [
          {
            role: "system",
            content:
              "Convert these articles into a Fluxa STORY gist. Output JSON: headline, context, narration, image_keyword.",
          },
          { role: "user", content: externalPack },
        ],
        "gpt-4o-mini"
      );

      return new Response(completion.choices[0].message.content, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completion = await openaiChat(
      [
        {
          role: "system",
          content:
            "Generate a Fluxa STORY gist from scratch. Output JSON: headline, context, narration, image_keyword.",
        },
        { role: "user", content: topic },
      ],
      "gpt-5"
    );

    return new Response(completion.choices[0].message.content, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
'@

Write-FunctionFile "generate-stories/index.ts" $generateStories


# -------------------------------------------------------
# 4) generate-sports-gist/index.ts
# -------------------------------------------------------
$generateSports = @'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function statpalFetch(topic: string) {
  const key = Deno.env.get("STATPAL_KEY");
  if (!key) return null;

  try {
    const r = await fetch(
      `https://api.statpal.io/search?q=${encodeURIComponent(topic)}&limit=5`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function openaiChat(messages: any[], model = "gpt-4o-mini") {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, temperature: 0.8, messages }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { topic } = await req.json();
    if (!topic) throw new Error("Missing topic");

    const statpal = await statpalFetch(topic);
    const externalAvailable = !!statpal?.results?.length;

    if (externalAvailable) {
      const pack = statpal.results
        .slice(0, 5)
        .map((x: any, i: number) => `(${i + 1}) ${x.title}\n${x.summary ?? ""}`)
        .join("\n\n");

      const completion = await openaiChat([
        {
          role: "system",
          content:
            "Summarize these sports results into a Fluxa sports gist. Output JSON: headline, context, narration, image_keyword, source_title, source_url.",
        },
        { role: "user", content: pack },
      ]);

      return new Response(completion.choices[0].message.content, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completion = await openaiChat(
      [
        {
          role: "system",
          content:
            "Generate a Fluxa sports gist from scratch. Output JSON: headline, context, narration, image_keyword.",
        },
        { role: "user", content: topic },
      ],
      "gpt-5"
    );

    return new Response(completion.choices[0].message.content, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
'@

Write-FunctionFile "generate-sports-gist/index.ts" $generateSports


Write-Host ""
Write-Host "✔️ All files updated." -ForegroundColor Green

Write-Host ""
Write-Host "📌 Secrets checklist (Supabase → Edge Functions → Secrets):" -ForegroundColor Cyan
@(
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SB_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)",
  "OPENAI_API_KEY",
  "CRON_SECRET  <-- REQUIRED",
  "NEWSAPI_KEY (optional)",
  "GUARDIAN_API_KEY (optional)",
  "MEDIASTACK_KEY (optional)",
  "STATPAL_KEY (optional)"
) | ForEach-Object { Write-Host " - $_" }

Write-Host ""
Write-Host "🚀 Deploying functions..." -ForegroundColor Cyan

$functions = @(
  "generate-gist",
  "generate-stories",
  "generate-sports-gist",
  "publish-gist"
)

foreach ($fn in $functions) {
  Write-Host "⚡ Deploying $fn..." -ForegroundColor Yellow
  supabase functions deploy $fn
}

Write-Host ""
Write-Host "🎉 Deployment complete. Re-run Pipeline Test." -ForegroundColor Green
