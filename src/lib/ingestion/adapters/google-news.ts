import { BaseAdapter } from "./base";
import type { NormalizedItem } from "../types";

interface GoogleNewsAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  country?: string;
  language?: string;
  topic?: string;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<GoogleNewsAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://google-news22.p.rapidapi.com/v2/topic-headlines",
  host: "google-news22.p.rapidapi.com",
  country: "us",
  language: "en",
  topic: "business",
};

export class GoogleNewsAdapter extends BaseAdapter {
  sourceKey = "google-news";
  private options: GoogleNewsAdapterOptions;

  constructor(options: GoogleNewsAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    console.log("Using adapter: google-news (rapidapi)");
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const { baseUrl, country, language, topic } = this.options;
    const params = new URLSearchParams({
      country: country ?? "us",
      language: language ?? "en",
      topic: topic ?? "business",
    });

    const url = `${baseUrl}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
    });

    if (!response.ok) {
      // Enhanced error logging for debugging
      let errorDetail = `Google News RapidAPI fetch failed: ${response.status}`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorDetail += ` - ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        // Ignore errors reading response body
      }

      console.error(`[Google News RapidAPI] Request failed:`, {
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
    // Google News API returns data in { data: { items: [...] } } format
    const articles: any[] = Array.isArray(raw?.data?.items)
      ? raw.data.items
      : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.articles)
      ? raw.articles
      : [];

    const items = articles.slice(0, this.options.maxItemsPerRun).map((article: any) => ({
      title: article.title || article.headline || "",
      sourceUrl: this.normalizeUrl(article.url || article.link),
      imageUrl: article.images?.thumbnail || article.image || article.thumbnail || undefined,
      excerpt: article.snippet || article.description || undefined,
      publishedAt: this.parseDate(article.published || article.publishedAt || article.date),
      externalId: article.id || article.url || article.link || undefined,
      categories: article.source?.name ? [article.source.name] : undefined,
      rawData: article,
    })) as NormalizedItem[];

    return items;
  }
}
