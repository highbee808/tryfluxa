import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface NewsApiRapidApiAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  query?: string;
  language?: string;
  sortBy?: string;
  limit?: number;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<NewsApiRapidApiAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://newsapi-rapidapi.p.rapidapi.com/v2/everything",
  host: "newsapi-rapidapi.p.rapidapi.com",
  query: "news",
  language: "en",
  sortBy: "publishedAt",
  limit: 50,
};

export class NewsApiRapidApiAdapter extends BaseAdapter {
  sourceKey = "newsapi-rapidapi";
  private options: NewsApiRapidApiAdapterOptions;

  constructor(options: NewsApiRapidApiAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: newsapi (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const { baseUrl, query, language, sortBy, limit } = this.options;
    const params = new URLSearchParams({
      q: query ?? "",
      language: language ?? "en",
      sortBy: sortBy ?? "publishedAt",
      pageSize: String(Math.min(limit ?? 50, this.options.maxItemsPerRun)),
    });

    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });
    
    if (!response.ok) {
      // Enhanced error logging for debugging 404s
      let errorDetail = `NewsAPI RapidAPI fetch failed: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail += ` - ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore errors reading response body
      }
      
      // Log the actual URL and host for debugging
      console.error(`[NewsAPI RapidAPI] Request failed:`, {
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
    const articles: any[] = Array.isArray(raw?.articles) ? raw.articles : [];
    const items = articles.slice(0, this.options.maxItemsPerRun).map((article: any) => ({
      title: article.title || "",
      sourceUrl: this.normalizeUrl(article.url),
      imageUrl: article.urlToImage || undefined,
      excerpt: article.description || undefined,
      publishedAt: this.parseDate(article.publishedAt),
      externalId: article.url || undefined,
      categories: article.source?.name ? [article.source.name] : undefined,
      rawData: article,
    })) as NormalizedItem[];
    return items;
  }
}
