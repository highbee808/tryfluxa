import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface SoccerSportsOpenDataAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<SoccerSportsOpenDataAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://sportsop-soccer-sports-open-data-v1.p.rapidapi.com",
  host: "sportsop-soccer-sports-open-data-v1.p.rapidapi.com",
};

export class SoccerSportsOpenDataAdapter extends BaseAdapter {
  sourceKey = "soccer-sports-open-data";
  private options: SoccerSportsOpenDataAdapterOptions;

  constructor(options: SoccerSportsOpenDataAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: soccer-sports-open-data (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    // Using a simple endpoint - this may need adjustment based on actual API structure
    const url = `${this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!}/v1/leagues`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });

    if (!response.ok) {
      let errorDetail = `Soccer Sports Open Data RapidAPI fetch failed: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail += ` - ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore errors reading response body
      }

      console.error(`[Soccer Sports Open Data RapidAPI] Request failed:`, {
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
    const items: any[] = Array.isArray(raw?.leagues)
      ? raw.leagues
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.results)
      ? raw.results
      : Array.isArray(raw)
      ? raw
      : [];

    const normalizedItems = items.slice(0, this.options.maxItemsPerRun).map((item: any) => ({
      title: item.name || item.title || item.league_name || "",
      sourceUrl: this.normalizeUrl(item.url || item.link || item.website),
      imageUrl: item.image || item.imageUrl || item.logo || item.logo_url || undefined,
      excerpt: item.description || item.summary || undefined,
      publishedAt: this.parseDate(item.publishedAt || item.updated_at || item.start_date),
      externalId: item.id ? String(item.id) : item.league_id ? String(item.league_id) : undefined,
      contentType: "sports",
      rawData: item,
    })) as NormalizedItem[];

    return normalizedItems;
  }
}
