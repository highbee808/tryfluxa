import type { ContentAdapter } from "../types.js";
import { MediastackRapidApiAdapter } from "./mediastack-rapidapi.js";
import { NewsApiRapidApiAdapter } from "./newsapi-rapidapi.js";
import { RapidApiSportsAdapter } from "./rapidapi-sports.js";
import { TmdbAdapter } from "./tmdb.js";
import { TicketmasterAdapter } from "./ticketmaster.js";
import { ApiSportsAdapter } from "./api-sports.js";
import { GoogleNewsAdapter } from "./google-news.js";
import { NewsXAdapter } from "./newsx.js";
import { BizNewsAdapter } from "./biz-news.js";
import { WebitNewsSearchAdapter } from "./webit-news-search.js";
import { RealTimeSportsNewsApiAdapter } from "./real-time-sports-news-api.js";
import { TheRundownAdapter } from "./therundown.js";
import { SoccerSportsOpenDataAdapter } from "./soccer-sports-open-data.js";
import { GamesDetailsAdapter } from "./games-details.js";
import { FreeApiLiveFootballDataAdapter } from "./free-api-live-football-data.js";

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
    case "biz-news-api":
      return new BizNewsAdapter({ maxItemsPerRun });
    case "mediastack-rapidapi":
      return new MediastackRapidApiAdapter({ maxItemsPerRun });
    case "newsapi-rapidapi":
      return new NewsApiRapidApiAdapter({ maxItemsPerRun });
    case "rapidapi-sports":
      return new RapidApiSportsAdapter({ maxItemsPerRun });
    case "webit-news-search":
      return new WebitNewsSearchAdapter({ maxItemsPerRun });
    case "real-time-sports-news-api":
      return new RealTimeSportsNewsApiAdapter({ maxItemsPerRun });
    case "therundown":
      return new TheRundownAdapter({ maxItemsPerRun });
    case "soccer-sports-open-data":
      return new SoccerSportsOpenDataAdapter({ maxItemsPerRun });
    case "games-details":
      return new GamesDetailsAdapter({ maxItemsPerRun });
    case "free-api-live-football-data":
      return new FreeApiLiveFootballDataAdapter({ maxItemsPerRun });
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
