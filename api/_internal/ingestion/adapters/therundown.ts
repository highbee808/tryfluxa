import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface TheRundownAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  sportId?: string;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<TheRundownAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://therundown-therundown-v1.p.rapidapi.com",
  host: "therundown-therundown-v1.p.rapidapi.com",
  sportId: "1", // Default to a common sport ID
};

export class TheRundownAdapter extends BaseAdapter {
  sourceKey = "therundown";
  private options: TheRundownAdapterOptions;

  constructor(options: TheRundownAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: therundown (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const sportId = this.options.sportId || DEFAULT_OPTIONS.sportId!;

    const url = `${this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!}/sports/${sportId}/conferences`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });

    if (!response.ok) {
      let errorDetail = `TheRundown RapidAPI fetch failed: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail += ` - ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore errors reading response body
      }

      console.error(`[TheRundown RapidAPI] Request failed:`, {
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
    const items: any[] = Array.isArray(raw?.conferences)
      ? raw.conferences
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
      ? raw
      : [];

    const normalizedItems = items.slice(0, this.options.maxItemsPerRun).map((item: any) => ({
      title: item.name || item.title || item.description || "",
      sourceUrl: this.normalizeUrl(item.url || item.link),
      imageUrl: item.image || item.imageUrl || item.logo || undefined,
      excerpt: item.description || item.summary || undefined,
      publishedAt: this.parseDate(item.publishedAt || item.updated_at || item.created_at),
      externalId: item.id ? String(item.id) : item.conference_id ? String(item.conference_id) : undefined,
      contentType: "sports",
      rawData: item,
    })) as NormalizedItem[];

    return normalizedItems;
  }
}
