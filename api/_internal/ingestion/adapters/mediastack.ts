import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface MediastackAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  limit?: number;
  keywords?: string;
  languages?: string;
  sort?: string;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<MediastackAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "http://api.mediastack.com/v1/news",
  limit: 50,
  keywords: "news",
  languages: "en",
  sort: "published_desc",
};

export class MediastackAdapter extends BaseAdapter {
  sourceKey = "mediastack";
  private options: MediastackAdapterOptions;

  constructor(options: MediastackAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.MEDIASTACK_KEY;
    if (!apiKey) {
      throw new Error("MEDIASTACK_KEY is not configured");
    }

    const { baseUrl, limit, keywords, languages, sort } = this.options;
    const params = new URLSearchParams({
      access_key: apiKey,
      keywords: keywords ?? "",
      languages: languages ?? "en",
      sort: sort ?? "published_desc",
      limit: String(Math.min(limit ?? 50, this.options.maxItemsPerRun)),
    });

    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mediastack fetch failed: ${response.status}`);
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
