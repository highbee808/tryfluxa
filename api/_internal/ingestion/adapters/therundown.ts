import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface TheRundownAdapterOptions {
  apiKey?: string;
  host?: string;
  baseUrl?: string;
  maxItemsPerRun: number;
}

// Sport IDs that typically have active events year-round
const SPORT_IDS = [
  { id: "4", name: "NBA" },
  { id: "6", name: "NHL" },
  { id: "5", name: "NCAA Basketball" },
  { id: "3", name: "MLB" },
  { id: "2", name: "NFL" },
];

const DEFAULT_OPTIONS: Omit<TheRundownAdapterOptions, "maxItemsPerRun"> = {
  baseUrl: "https://therundown-therundown-v1.p.rapidapi.com",
  host: "therundown-therundown-v1.p.rapidapi.com",
};

export class TheRundownAdapter extends BaseAdapter {
  sourceKey = "therundown";
  private options: TheRundownAdapterOptions;

  constructor(options: TheRundownAdapterOptions) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async fetch(): Promise<unknown> {
    const apiKey = this.options.apiKey || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const host = this.options.host || DEFAULT_OPTIONS.host!;
    const baseUrl = this.options.baseUrl || DEFAULT_OPTIONS.baseUrl!;
    const today = new Date().toISOString().split("T")[0];

    const allEvents: any[] = [];

    for (const sport of SPORT_IDS) {
      const url = `${baseUrl}/sports/${sport.id}/events/${today}`;

      try {
        const response = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": host,
          },
        });

        if (!response.ok) {
          console.warn(`[TheRundown] ${sport.name} fetch failed: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const events = data.events || [];

        for (const event of events) {
          event._sportName = sport.name;
        }

        allEvents.push(...events);
      } catch (err: any) {
        console.warn(`[TheRundown] ${sport.name} error: ${err.message}`);
      }
    }

    return { events: allEvents };
  }

  async parse(raw: any): Promise<NormalizedItem[]> {
    const events: any[] = raw?.events || [];
    const items: NormalizedItem[] = [];

    for (const event of events.slice(0, this.options.maxItemsPerRun)) {
      const parsed = this.parseEvent(event);
      if (parsed) items.push(parsed);
    }

    return items;
  }

  private parseEvent(event: any): NormalizedItem | null {
    const teams = event.teams_normalized || event.teams || [];
    if (teams.length < 2) return null;

    const away = teams.find((t: any) => t.is_away) || teams[0];
    const home = teams.find((t: any) => t.is_home) || teams[1];
    const score = event.score || {};
    const sport = event._sportName || "Sports";
    const status = score.event_status_detail || score.event_status || "";
    const isFinal = score.event_status === "STATUS_FINAL";
    const isLive =
      score.event_status === "STATUS_IN_PROGRESS" ||
      score.event_status === "STATUS_HALFTIME";

    const awayName = away.mascot ? `${away.name} ${away.mascot}` : away.name;
    const homeName = home.mascot ? `${home.name} ${home.mascot}` : home.name;

    // Build title based on game status
    let title: string;
    if (isFinal) {
      title = `${awayName} ${score.score_away} - ${homeName} ${score.score_home} (Final)`;
    } else if (isLive) {
      title = `${awayName} ${score.score_away ?? 0} - ${homeName} ${score.score_home ?? 0} (Live)`;
    } else {
      title = `${awayName} at ${homeName}`;
    }

    // Build excerpt with details
    const parts: string[] = [];
    parts.push(`${sport}`);

    if (score.venue_name) {
      const venue = score.venue_location
        ? `${score.venue_name}, ${score.venue_location}`
        : score.venue_name;
      parts.push(venue);
    }

    if (away.record) parts.push(`${away.abbreviation || away.name} (${away.record})`);
    if (home.record) parts.push(`${home.abbreviation || home.name} (${home.record})`);

    if (isFinal && score.score_away_by_period) {
      parts.push(`Q: ${score.score_away_by_period.join("-")} / ${score.score_home_by_period.join("-")}`);
    }

    if (score.broadcast) parts.push(`TV: ${score.broadcast}`);
    if (status && !isFinal && !isLive) parts.push(status);

    const excerpt = parts.join(" · ");

    return {
      title,
      sourceUrl: "",
      excerpt,
      publishedAt: this.parseDate(score.updated_at || event.event_date),
      externalId: event.event_id,
      contentType: "sports",
      categories: [sport],
      rawData: event,
    };
  }
}
