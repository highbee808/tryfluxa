import { BaseAdapter } from "./base";
import type { NormalizedItem } from "../types";

interface TicketmasterAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  countryCode?: string;
  size?: number;
  maxItemsPerRun: number;
}

const DEFAULT_OPTIONS: Omit<TicketmasterAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://app.ticketmaster.com/discovery/v2/events.json",
  countryCode: "US",
  size: 50,
};

export class TicketmasterAdapter extends BaseAdapter {
  sourceKey = "ticketmaster";
  private options: TicketmasterAdapterOptions;

  constructor(options: TicketmasterAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error("TICKETMASTER_API_KEY is not configured");
    }

    const size = Math.min(this.options.size ?? DEFAULT_OPTIONS.size!, this.options.maxItemsPerRun);
    const params = new URLSearchParams({
      apikey: apiKey,
      countryCode: this.options.countryCode || DEFAULT_OPTIONS.countryCode!,
      size: String(size),
      sort: "date,asc",
    });

    const url = `${this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ticketmaster fetch failed: ${response.status}`);
    }
    return response.json();
  }

  async parse(raw: any): Promise<NormalizedItem[]> {
    const events = Array.isArray(raw?._embedded?.events)
      ? raw._embedded.events
      : [];
    const items = events.slice(0, this.options.maxItemsPerRun).map((event: any) => {
      const classifications = Array.isArray(event.classifications)
        ? event.classifications
        : [];
      const firstClassification = classifications[0];
      const category =
        firstClassification?.segment?.name || firstClassification?.genre?.name;

      return {
        title: event.name || "",
        sourceUrl: this.normalizeUrl(event.url),
        imageUrl: Array.isArray(event.images) && event.images.length > 0 ? event.images[0].url : undefined,
        excerpt: event.info || event.description || undefined,
        publishedAt: this.parseDate(event.dates?.start?.dateTime),
        externalId: event.id || undefined,
        contentType: "event",
        categories: category ? [category] : undefined,
        rawData: event,
      } satisfies NormalizedItem;
    });
    return items;
  }
}
