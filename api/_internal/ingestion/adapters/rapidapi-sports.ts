import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface RapidApiSportsOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  query?: string;
  limit?: number;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<RapidApiSportsOptions, "maxItemsPerRun"> = {
  baseUrl: "https://sportspage-feeds.p.rapidapi.com/news",
  host: "sportspage-feeds.p.rapidapi.com",
  query: "sports",
  limit: 50,
};

export class RapidApiSportsAdapter extends BaseAdapter {
  sourceKey = "rapidapi-sports";
  private options: RapidApiSportsOptions;

  constructor(options: RapidApiSportsOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: rapidapi-sports");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const limit = Math.min(this.options.limit ?? DEFAULT_OPTIONS.limit!, this.options.maxItemsPerRun);
    const params = new URLSearchParams({
      q: this.options.query || DEFAULT_OPTIONS.query!,
      limit: String(limit),
    });

    const url = `${this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });
    if (!response.ok) {
      throw new Error(`RapidAPI sports fetch failed: ${response.status}`);
    }
    return response.json();
  }

  async parse(raw: any): Promise<NormalizedItem[]> {
    const articles: any[] = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
    const items = articles.slice(0, this.options.maxItemsPerRun).map((article: any) => ({
      title: article.title || "",
      sourceUrl: this.normalizeUrl(article.link || article.url),
      imageUrl: article.image || article.thumbnail || undefined,
      excerpt: article.description || article.summary || undefined,
      publishedAt: this.parseDate(article.pubDate || article.publishedAt),
      externalId: article.id ? String(article.id) : article.link || article.url || undefined,
      contentType: "sports",
      rawData: article,
    })) as NormalizedItem[];
    return items;
  }
}
