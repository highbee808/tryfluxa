import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface BizNewsAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  query?: string;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<BizNewsAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://biz-news-api.p.rapidapi.com",
  host: "biz-news-api.p.rapidapi.com",
  query: "business",
};

export class BizNewsAdapter extends BaseAdapter {
  sourceKey = "biz-news-api";
  private options: BizNewsAdapterOptions;

  constructor(options: BizNewsAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: biz-news-api (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const query = this.options.query || DEFAULT_OPTIONS.query!;
    
    const params = new URLSearchParams({
      q: query,
    });

    const url = `${this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!}/news?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });

    if (!response.ok) {
      // Enhanced error logging for debugging
      let errorDetail = `Biz News API RapidAPI fetch failed: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail += ` - ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore errors reading response body
      }

      console.error(`[Biz News API RapidAPI] Request failed:`, {
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
    // Parse Biz News API response
    // API returns data in { articles: [...] } or { results: [...] } or array format
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
