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

interface AdapterFactoryOptions {
  maxItemsPerRun: number;
}

export function getAdapter(
  sourceKey: string,
  options: AdapterFactoryOptions
): ContentAdapter {
  const { maxItemsPerRun } = options;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adapters/index.ts:getAdapter',message:'Adapter lookup',data:{sourceKey,sourceKeyLength:sourceKey.length,sourceKeyChars:sourceKey.split('').map(c=>c.charCodeAt(0))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  switch (sourceKey) {
    // RapidAPI adapters - prioritized first
    case "google-news":
      return new GoogleNewsAdapter({ maxItemsPerRun });
    case "newsx":
      return new NewsXAdapter({ maxItemsPerRun });
    case "biz-news-api":
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adapters/index.ts:biz-news-api case',message:'Biz News adapter matched',data:{sourceKey},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return new BizNewsAdapter({ maxItemsPerRun });
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adapters/index.ts:default case',message:'Adapter not found - default case hit',data:{sourceKey,sourceKeyLength:sourceKey.length,sourceKeyChars:sourceKey.split('').map(c=>c.charCodeAt(0)),allCases:['google-news','newsx','biz-news-api','mediastack-rapidapi','newsapi-rapidapi','rapidapi-sports','tmdb','ticketmaster','api-sports']},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw new Error(`Adapter not found for sourceKey: ${sourceKey}`);
  }
}
