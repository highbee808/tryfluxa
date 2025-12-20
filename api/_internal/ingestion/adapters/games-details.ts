import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface GamesDetailsAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  limit?: number;
  offset?: number;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<GamesDetailsAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://games-details.p.rapidapi.com",
  host: "games-details.p.rapidapi.com",
  limit: 50,
  offset: 0,
};

export class GamesDetailsAdapter extends BaseAdapter {
  sourceKey = "games-details";
  private options: GamesDetailsAdapterOptions;

  constructor(options: GamesDetailsAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: games-details (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const limit = Math.min(this.options.limit ?? DEFAULT_OPTIONS.limit!, this.options.maxItemsPerRun);
    const offset = this.options.offset ?? DEFAULT_OPTIONS.offset!;
    
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });

    // Using a generic news endpoint - adjust based on actual API structure
    const url = `${this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!}/news?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });

    if (!response.ok) {
      let errorDetail = `Games Details RapidAPI fetch failed: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail += ` - ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore errors reading response body
      }

      console.error(`[Games Details RapidAPI] Request failed:`, {
        url,
        host,
        status: response.status,
        statusText: response.statusText,
      });

      throw new Error(errorDetail);
    }
    
    return response.json();
  }

  async parse(raw: any): Promise<NormalizedItem[]> {
    const articles: any[] = Array.isArray(raw?.articles)
      ? raw.articles
      : Array.isArray(raw?.results)
      ? raw.results
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.news)
      ? raw.news
      : Array.isArray(raw)
      ? raw
      : [];

    const items = articles.slice(0, this.options.maxItemsPerRun).map((article: any) => ({
      title: article.title || article.headline || "",
      sourceUrl: this.normalizeUrl(article.url || article.link || article.source?.url),
      imageUrl: article.image || article.imageUrl || article.thumbnail || article.urlToImage || undefined,
      excerpt: article.description || article.excerpt || article.summary || article.content?.substring(0, 200) || undefined,
      publishedAt: this.parseDate(article.publishedAt || article.published_at || article.pubDate || article.date || article.published),
      externalId: article.id ? String(article.id) : article.url || article.link || undefined,
      contentType: "gaming",
      categories: article.category ? [article.category] : article.categories || undefined,
      rawData: article,
    })) as NormalizedItem[];

    return items;
  }
}
