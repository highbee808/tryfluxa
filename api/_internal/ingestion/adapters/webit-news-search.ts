import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface WebitNewsSearchAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  language?: string;
  category?: string;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<WebitNewsSearchAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://webit-news-search.p.rapidapi.com",
  host: "webit-news-search.p.rapidapi.com",
  language: "en",
  category: "all",
};

export class WebitNewsSearchAdapter extends BaseAdapter {
  sourceKey = "webit-news-search";
  private options: WebitNewsSearchAdapterOptions;

  constructor(options: WebitNewsSearchAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: webit-news-search (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const params = new URLSearchParams({
      language: this.options.language || DEFAULT_OPTIONS.language!,
      category: this.options.category || DEFAULT_OPTIONS.category!,
    });

    const url = `${this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!}/trending?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });

    if (!response.ok) {
      let errorDetail = `Webit News Search RapidAPI fetch failed: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail += ` - ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore errors reading response body
      }

      console.error(`[Webit News Search RapidAPI] Request failed:`, {
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
      categories: article.category ? [article.category] : article.categories || undefined,
      rawData: article,
    })) as NormalizedItem[];

    return items;
  }
}
