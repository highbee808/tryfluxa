import type { ContentAdapter } from "../types";
import { MediastackAdapter } from "./mediastack";
import { TmdbAdapter } from "./tmdb";
import { RapidApiSportsAdapter } from "./rapidapi-sports";
import { TicketmasterAdapter } from "./ticketmaster";
import { ApiSportsAdapter } from "./api-sports";

interface AdapterFactoryOptions {
  maxItemsPerRun: number;
}

export function getAdapter(
  sourceKey: string,
  options: AdapterFactoryOptions
): ContentAdapter {
  const { maxItemsPerRun } = options;
  switch (sourceKey) {
    case "mediastack":
      return new MediastackAdapter({ maxItemsPerRun });
    case "tmdb":
      return new TmdbAdapter({ maxItemsPerRun });
    case "rapidapi-sports":
      return new RapidApiSportsAdapter({ maxItemsPerRun });
    case "ticketmaster":
      return new TicketmasterAdapter({ maxItemsPerRun });
    case "api-sports":
      return new ApiSportsAdapter({ maxItemsPerRun });
    default:
      throw new Error(`Adapter not found for sourceKey: ${sourceKey}`);
  }
}
