import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface TmdbAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  imageBaseUrl?: string;
  mediaTypes?: Array<"movie" | "tv">;
  perTypeLimit?: number;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<TmdbAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://api.themoviedb.org/3",
  imageBaseUrl: "https://image.tmdb.org/t/p/w500",
  mediaTypes: ["movie", "tv"],
  perTypeLimit: 50,
};

export class TmdbAdapter extends BaseAdapter {
  sourceKey = "tmdb";
  private options: TmdbAdapterOptions;

  constructor(options: TmdbAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private buildUrl(mediaType: "movie" | "tv"): string {
    const baseUrl = this.options.baseUrl ?? DEFAULT_OPTIONS.baseUrl;
    const apiKey =
      this.options.apiKey || process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
    if (!apiKey) {
      throw new Error("TMDB_API_KEY is not configured");
    }
    const params = new URLSearchParams({
      api_key: apiKey,
      page: "1",
    });
    return `${baseUrl}/trending/${mediaType}/day?${params.toString()}`;
  }

  async fetch(): Promise<unknown> {
    const mediaTypes = this.options.mediaTypes ?? DEFAULT_OPTIONS.mediaTypes!;
    const results: any[] = [];
    for (const type of mediaTypes) {
      const url = this.buildUrl(type);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TMDB fetch failed for ${type}: ${response.status}`);
      }
      const json = await response.json();
      results.push({ type, data: json?.results ?? [] });
    }
    return results;
  }

  async parse(raw: any): Promise<NormalizedItem[]> {
    const aggregated: NormalizedItem[] = [];
    const imageBase = this.options.imageBaseUrl ?? DEFAULT_OPTIONS.imageBaseUrl!;
    const perTypeLimit = Math.min(
      this.options.perTypeLimit ?? DEFAULT_OPTIONS.perTypeLimit!,
      this.options.maxItemsPerRun
    );

    const results = Array.isArray(raw) ? raw : [];
    for (const entry of results) {
      const items = Array.isArray(entry?.data) ? entry.data.slice(0, perTypeLimit) : [];
      for (const item of items) {
        const title = item.title || item.name || "";
        const mediaType: "movie" | "tv" = entry.type;
        const posterPath = item.poster_path ? `${imageBase}${item.poster_path}` : undefined;
        aggregated.push({
          title,
          sourceUrl: `https://www.themoviedb.org/${mediaType}/${item.id}`,
          imageUrl: posterPath,
          excerpt: item.overview || undefined,
          publishedAt: this.parseDate(item.release_date || item.first_air_date),
          externalId: item.id ? String(item.id) : undefined,
          contentType: mediaType,
          rawData: item,
        });
        if (aggregated.length >= this.options.maxItemsPerRun) break;
      }
      if (aggregated.length >= this.options.maxItemsPerRun) break;
    }
    return aggregated.slice(0, this.options.maxItemsPerRun);
  }
}
