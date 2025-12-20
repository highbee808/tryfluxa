import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface RealTimeSportsNewsApiAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  category?: string;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<RealTimeSportsNewsApiAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://real-time-sports-news-api.p.rapidapi.com",
  host: "real-time-sports-news-api.p.rapidapi.com",
  category: "sports",
};

export class RealTimeSportsNewsApiAdapter extends BaseAdapter {
  sourceKey = "real-time-sports-news-api";
  private options: RealTimeSportsNewsApiAdapterOptions;

  constructor(options: RealTimeSportsNewsApiAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: real-time-sports-news-api (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const params = new URLSearchParams({
      category: this.options.category || DEFAULT_OPTIONS.category!,
    });

    const url = `${this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!}/sources-by-category?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });

    if (!response.ok) {
      let errorDetail = `Real-Time Sports News API RapidAPI fetch failed: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail += ` - ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore errors reading response body
      }

      console.error(`[Real-Time Sports News API RapidAPI] Request failed:`, {
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
      : Array.isArray(raw?.sources)
      ? raw.sources
      : Array.isArray(raw)
      ? raw
      : [];

    const items = articles.slice(0, this.options.maxItemsPerRun).map((article: any) => ({
      title: article.title || article.headline || article.name || "",
      sourceUrl: this.normalizeUrl(article.url || article.link || article.source?.url),
      imageUrl: article.image || article.imageUrl || article.thumbnail || article.urlToImage || undefined,
      excerpt: article.description || article.excerpt || article.summary || article.content?.substring(0, 200) || undefined,
      publishedAt: this.parseDate(article.publishedAt || article.published_at || article.pubDate || article.date || article.published),
      externalId: article.id ? String(article.id) : article.url || article.link || undefined,
      contentType: "sports",
      categories: article.category ? [article.category] : article.categories || undefined,
      rawData: article,
    })) as NormalizedItem[];

    return items;
  }
}
