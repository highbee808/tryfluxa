import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders } from "../_shared/http.ts";

type Category = "news" | "sports" | "music";

interface NormalizedApiItem {
  category: Category;
  query: string;
  title: string;
  url: string;
  description?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | null;
  summary?: string | null;
  source?: string | null;
  raw: Record<string, unknown>;
}

const ALLOWED_CATEGORIES: Category[] = ["news", "sports", "music"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const DEFAULT_TTL_MINUTES = 60;
const MIN_CACHE_ROWS = 5;
const SUMMARY_MODEL = "gpt-4o-mini";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase service credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedCronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && providedCronSecret && providedCronSecret !== cronSecret) {
    return jsonResponse(
      { error: "Unauthorized: invalid cron secret" },
      401,
    );
  }

  try {
    const url = new URL(req.url);
    const categoryParam = (url.searchParams.get("category") || "").trim()
      .toLowerCase() as Category;
    const queryParam = (url.searchParams.get("query") || "").trim();
    const limitParam = Number(url.searchParams.get("limit")) || DEFAULT_LIMIT;
    const ttlParam = Number(url.searchParams.get("ttl_minutes")) ||
      DEFAULT_TTL_MINUTES;

    if (!categoryParam || !ALLOWED_CATEGORIES.includes(categoryParam)) {
      return jsonResponse(
        { error: "category must be one of news, sports, music" },
        400,
      );
    }

    if (!queryParam) {
      return jsonResponse({ error: "query parameter is required" }, 400);
    }

    const limit = clamp(limitParam, 1, MAX_LIMIT);
    const ttlMinutes = Math.max(ttlParam, 5);
    const freshnessThreshold = new Date(
      Date.now() - ttlMinutes * 60 * 1000,
    ).toISOString();

    const cachedItems = await getCachedItems(
      categoryParam,
      queryParam,
      freshnessThreshold,
      limit,
    );

    if (
      cachedItems.length >= limit ||
      cachedItems.length >= MIN_CACHE_ROWS
    ) {
      return jsonResponse({ source: "cache", items: cachedItems });
    }

    const fetchedItems = await fetchFromRapidApi(
      categoryParam,
      queryParam,
      limit,
    );

    const uniqueFreshItems = await dedupeAgainstCache(fetchedItems);

    const enrichedItems = await enrichSummariesIfNeeded(uniqueFreshItems);

    if (enrichedItems.length > 0) {
      const insertPayload = enrichedItems.map((item) => ({
        category: item.category,
        query: item.query,
        source: item.source ?? "api",
        title: item.title,
        url: item.url,
        image_url: item.imageUrl,
        summary: item.summary,
        raw: item.raw,
        published_at: item.publishedAt ?? null,
      }));

      const { error: insertError } = await supabase
        .from("news_cache")
        .insert(insertPayload);

      if (insertError) {
        console.error("Failed to store fresh items:", insertError);
      }
    }

    const freshestItems = await getLatestItems(
      categoryParam,
      queryParam,
      limit,
    );

    return jsonResponse({
      source: "api->cache",
      items: freshestItems,
    });
  } catch (error) {
    console.error("fetch-content failed", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});

async function getCachedItems(
  category: Category,
  query: string,
  freshnessIso: string,
  limit: number,
) {
  const { data, error } = await supabase
    .from("news_cache")
    .select("*")
    .eq("category", category)
    .eq("query", query)
    .gte("created_at", freshnessIso)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error reading cache:", error);
    return [];
  }

  return data ?? [];
}

async function getLatestItems(
  category: Category,
  query: string,
  limit: number,
) {
  const { data, error } = await supabase
    .from("news_cache")
    .select("*")
    .eq("category", category)
    .eq("query", query)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error retrieving latest items:", error);
    return [];
  }

  return data ?? [];
}

async function fetchFromRapidApi(
  category: Category,
  query: string,
  limit: number,
): Promise<NormalizedApiItem[]> {
  const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
  const rapidApiHost = Deno.env.get("RAPIDAPI_HOST");

  if (!rapidApiKey || !rapidApiHost) {
    throw new Error("RapidAPI credentials are not configured");
  }

  // Check rate limit before making API call
  try {
    const rapidApiModule = await import("../_shared/rapidApiRateLimit.ts");
    const limitCheck = await rapidApiModule.checkRapidApiLimit(supabase);
    
    if (!limitCheck.allowed) {
      console.warn(`⚠️ RAPID API daily limit reached. Remaining: ${limitCheck.remaining}. Resets at: ${limitCheck.resetAt}`);
      throw new Error(`RAPID API daily limit reached. Resets at ${limitCheck.resetAt.toISOString()}`);
    }
    
    console.log(`✅ RAPID API limit check passed. Remaining: ${limitCheck.remaining} calls`);
  } catch (error) {
    // If rate limit check fails, log but continue (don't block)
    console.warn("Rate limit check failed, proceeding anyway:", error);
  }

  const baseUrl = Deno.env.get("RAPIDAPI_BASE_URL") ??
    `https://${rapidApiHost}`;

  const endpointConfig = resolveEndpoint(category, query, limit);
  const requestUrl = new URL(endpointConfig.path, ensureHttp(baseUrl));

  Object.entries(endpointConfig.searchParams).forEach(([key, value]) => {
    requestUrl.searchParams.set(key, value);
  });

  const response = await fetch(requestUrl.toString(), {
    headers: {
      "X-RapidAPI-Key": rapidApiKey,
      "X-RapidAPI-Host": rapidApiHost,
    },
  });

  if (!response.ok) {
    const body = await safeJson(response);
    console.error("RapidAPI error", response.status, body);
    throw new Error(`RapidAPI request failed with ${response.status}`);
  }

  const payload = await response.json().catch((err) => {
    console.error("Failed to parse RapidAPI payload", err);
    throw err;
  });

  const candidates = extractItemsFromPayload(payload);
  const normalized = candidates
    .map((raw) => normalizeCandidate(raw, category, query))
    .filter((item): item is NormalizedApiItem => Boolean(item));

  // Record the API call
  try {
    const rapidApiModule = await import("../_shared/rapidApiRateLimit.ts");
    await rapidApiModule.recordRapidApiCall(supabase, 1);
    console.log("✅ Recorded RAPID API call");
  } catch (error) {
    console.warn("Failed to record RAPID API call:", error);
  }

  return normalized.slice(0, limit * 2);
}

function resolveEndpoint(
  category: Category,
  query: string,
  limit: number,
) {
  // TODO: adjust endpoint paths/params to match the RapidAPI subscription being used.
  const commonParams = {
    query,
    limit: Math.min(limit * 2, MAX_LIMIT).toString(),
    country: "us",
    lang: "en",
  };

  switch (category) {
    case "sports":
      return {
        path: "/search",
        searchParams: { ...commonParams, topic: "sports" },
      };
    case "music":
      return {
        path: "/search",
        searchParams: { ...commonParams, topic: "music" },
      };
    default:
      return { path: "/search", searchParams: { ...commonParams } };
  }
}

function extractItemsFromPayload(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  if (Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: Record<string, unknown>[] }).data;
  }

  if (Array.isArray((payload as { articles?: unknown }).articles)) {
    return (payload as { articles: Record<string, unknown>[] }).articles;
  }

  if (Array.isArray((payload as { items?: unknown }).items)) {
    return (payload as { items: Record<string, unknown>[] }).items;
  }

  return [];
}

function normalizeCandidate(
  raw: Record<string, unknown>,
  category: Category,
  query: string,
): NormalizedApiItem | null {
  const title = stringField(raw, [
    "title",
    "name",
    "headline",
    "storyTitle",
  ]);
  const url = stringField(raw, ["url", "link", "storyUrl"]);

  if (!title || !url) {
    return null;
  }

  return {
    category,
    query,
    title,
    url,
    description: stringField(raw, [
      "description",
      "summary",
      "excerpt",
      "snippet",
    ]),
    imageUrl: stringField(raw, [
      "image_url",
      "imageUrl",
      "photo_url",
      "thumbnail",
    ]),
    publishedAt: parseDateField(raw, [
      "published_at",
      "pubDate",
      "date",
      "created_at",
    ]),
    summary: stringField(raw, ["summaryShort"]),
    source: stringField(raw, ["source", "source_id"]),
    raw,
  };
}

async function dedupeAgainstCache(
  items: NormalizedApiItem[],
): Promise<NormalizedApiItem[]> {
  if (items.length === 0) {
    return [];
  }

  const urls = Array.from(new Set(items.map((item) => item.url)));
  const { data, error } = await supabase
    .from("news_cache")
    .select("url")
    .in("url", urls);

  if (error) {
    console.error("Failed to fetch existing URLs", error);
    return items;
  }

  const existingUrls = new Set((data ?? []).map((row) => row.url));
  return items.filter((item) => !existingUrls.has(item.url));
}

async function enrichSummariesIfNeeded(
  items: NormalizedApiItem[],
): Promise<NormalizedApiItem[]> {
  if (items.length === 0) {
    return [];
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openAiKey) {
    console.warn("OPENAI_API_KEY missing, skipping summaries");
    return items;
  }

  const enriched: NormalizedApiItem[] = [];
  for (const item of items) {
    if (item.summary) {
      enriched.push(item);
      continue;
    }

    const prompt = [item.title, item.description ?? ""]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);

    try {
      const summary = await fetchOpenAiSummary(prompt, openAiKey);
      enriched.push({ ...item, summary: summary ?? item.summary ?? null });
    } catch (error) {
      console.error("OpenAI summary failed", error);
      enriched.push(item);
    }
  }

  return enriched;
}

async function fetchOpenAiSummary(
  prompt: string,
  apiKey: string,
): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SUMMARY_MODEL,
      temperature: 0.3,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: "Summarize this in 2-3 neutral sentences. No emojis.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await safeJson(response);
    console.error("OpenAI error", response.status, body);
    return null;
  }

  const data = await response.json().catch((err) => {
    console.error("Failed to parse OpenAI response", err);
    return null;
  });

  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : null;
}

function stringField(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function parseDateField(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }
  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ensureHttp(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url.replace(/^\/+/, "")}`;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

