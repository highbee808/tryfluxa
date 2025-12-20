import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface FreeApiLiveFootballDataAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  search?: string;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<FreeApiLiveFootballDataAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://free-api-live-football-data.p.rapidapi.com",
  host: "free-api-live-football-data.p.rapidapi.com",
  search: "",
};

export class FreeApiLiveFootballDataAdapter extends BaseAdapter {
  sourceKey = "free-api-live-football-data";
  private options: FreeApiLiveFootballDataAdapterOptions;

  constructor(options: FreeApiLiveFootballDataAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: free-api-live-football-data (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const params = new URLSearchParams({
      search: this.options.search || DEFAULT_OPTIONS.search!,
    });

    const url = `${this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!}/football-players-search?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });

    if (!response.ok) {
      let errorDetail = `Free API Live Football Data RapidAPI fetch failed: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail += ` - ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore errors reading response body
      }

      console.error(`[Free API Live Football Data RapidAPI] Request failed:`, {
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
    const players: any[] = Array.isArray(raw?.players)
      ? raw.players
      : Array.isArray(raw?.results)
      ? raw.results
      : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
      ? raw
      : [];

    const items = players.slice(0, this.options.maxItemsPerRun).map((player: any) => ({
      title: player.name || player.player_name || player.full_name || "",
      sourceUrl: this.normalizeUrl(player.url || player.link || player.profile_url),
      imageUrl: player.image || player.imageUrl || player.photo || player.thumbnail || undefined,
      excerpt: player.description || player.position || player.team || undefined,
      publishedAt: this.parseDate(player.birth_date || player.updated_at),
      externalId: player.id ? String(player.id) : player.player_id ? String(player.player_id) : undefined,
      contentType: "sports",
      rawData: player,
    })) as NormalizedItem[];

    return items;
  }
}
