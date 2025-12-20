import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface NewsXAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  limit?: number;
  skip?: number;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<NewsXAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://newsx.p.rapidapi.com",
  host: "newsx.p.rapidapi.com",
  limit: 50,
  skip: 0,
};

export class NewsXAdapter extends BaseAdapter {
  sourceKey = "newsx";
  private options: NewsXAdapterOptions;

  constructor(options: NewsXAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: newsx (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const limit = Math.min(this.options.limit ?? DEFAULT_OPTIONS.limit!, this.options.maxItemsPerRun);
    const skip = this.options.skip ?? DEFAULT_OPTIONS.skip!;
    
    const params = new URLSearchParams({
      limit: String(limit),
      skip: String(skip),
    });

    const url = `${this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!}/search?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });

    if (!response.ok) {
      // Enhanced error logging for debugging
      let errorDetail = `NewsX RapidAPI fetch failed: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail += ` - ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore errors reading response body
      }

      console.error(`[NewsX RapidAPI] Request failed:`, {
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
    // Raw fetch only - minimal parsing for now
    // NewsX API returns data in { articles: [...] } or { results: [...] } format
    const articles: any[] = Array.isArray(raw?.articles)
      ? raw.articles
      : Array.isArray(raw?.results)
      ? raw.results
      : Array.isArray(raw)
      ? raw
      : [];

    const items = articles.slice(0, this.options.maxItemsPerRun).map((article: any) => ({
      title: article.title || article.headline || "",
      sourceUrl: this.normalizeUrl(article.url || article.link),
      imageUrl: article.image || article.imageUrl || article.thumbnail || undefined,
      excerpt: article.description || article.excerpt || article.summary || undefined,
      publishedAt: this.parseDate(article.publishedAt || article.published_at || article.pubDate || article.date),
      externalId: article.id ? String(article.id) : article.url || article.link || undefined,
      rawData: article,
    })) as NormalizedItem[];

    return items;
  }
}
