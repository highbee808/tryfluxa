import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface MediastackRapidApiAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  limit?: number;
  keywords?: string;
  languages?: string;
  sort?: string;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<MediastackRapidApiAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://mediastack.p.rapidapi.com/news",
  host: "mediastack.p.rapidapi.com",
  limit: 50,
  keywords: "news",
  languages: "en",
  sort: "published_desc",
};

export class MediastackRapidApiAdapter extends BaseAdapter {
  sourceKey = "mediastack-rapidapi";
  private options: MediastackRapidApiAdapterOptions;

  constructor(options: MediastackRapidApiAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: mediastack (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const { baseUrl, limit, keywords, languages, sort } = this.options;
    const params = new URLSearchParams({
      keywords: keywords ?? "",
      languages: languages ?? "en",
      sort: sort ?? "published_desc",
      limit: String(Math.min(limit ?? 50, this.options.maxItemsPerRun)),
    });

    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Mediastack RapidAPI fetch failed: ${response.status}`);
    }
    return response.json();
  }

  async parse(raw: any): Promise<NormalizedItem[]> {
    const data = Array.isArray(raw?.data) ? raw.data : [];
    const items = data.slice(0, this.options.maxItemsPerRun).map((entry: any) => {
      const title = entry.title || "";
      return {
        title,
        sourceUrl: this.normalizeUrl(entry.url),
        imageUrl: entry.image || undefined,
        excerpt: entry.description || undefined,
        publishedAt: this.parseDate(entry.published_at),
        externalId: entry.url || undefined,
        categories: entry.category ? [entry.category] : undefined,
        rawData: entry,
      } satisfies NormalizedItem;
    });
    return items;
  }
}
