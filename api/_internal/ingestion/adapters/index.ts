import type { ContentAdapter } from "../types.js";
import { MediastackRapidApiAdapter } from "./mediastack-rapidapi.js";
import { NewsApiRapidApiAdapter } from "./newsapi-rapidapi.js";
import { RapidApiSportsAdapter } from "./rapidapi-sports.js";
import { TmdbAdapter } from "./tmdb.js";
import { TicketmasterAdapter } from "./ticketmaster.js";
import { ApiSportsAdapter } from "./api-sports.js";
import { GoogleNewsAdapter } from "./google-news.js";
import { NewsXAdapter } from "./newsx.js";

interface AdapterFactoryOptions {
  maxItemsPerRun: number;
}

export function getAdapter(
  sourceKey: string,
  options: AdapterFactoryOptions
): ContentAdapter {
  const { maxItemsPerRun } = options;
  switch (sourceKey) {
    // RapidAPI adapters - prioritized first
    case "google-news":
      return new GoogleNewsAdapter({ maxItemsPerRun });
    case "newsx":
      return new NewsXAdapter({ maxItemsPerRun });
    case "mediastack-rapidapi":
      return new MediastackRapidApiAdapter({ maxItemsPerRun });
    case "newsapi-rapidapi":
      return new NewsApiRapidApiAdapter({ maxItemsPerRun });
    case "rapidapi-sports":
      return new RapidApiSportsAdapter({ maxItemsPerRun });
    // Other active adapters
    case "tmdb":
      return new TmdbAdapter({ maxItemsPerRun });
    case "ticketmaster":
      return new TicketmasterAdapter({ maxItemsPerRun });
    case "api-sports":
      return new ApiSportsAdapter({ maxItemsPerRun });
    // Legacy/expired adapters - not supported
    case "guardian":
      throw new Error(`Adapter "guardian" is expired and no longer supported`);
    case "mediastack":
      throw new Error(`Adapter "mediastack" is expired. Use "mediastack-rapidapi" instead`);
    case "newsapi":
      throw new Error(`Adapter "newsapi" is expired. Use "newsapi-rapidapi" instead`);
    default:
      throw new Error(`Adapter not found for sourceKey: ${sourceKey}`);
  }
}
