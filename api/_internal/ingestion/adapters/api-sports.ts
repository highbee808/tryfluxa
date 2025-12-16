import { BaseAdapter } from "./base.js";
import type { NormalizedItem } from "../types.js";

interface ApiSportsAdapterOptions {
  maxItemsPerRun: number;
}

/**
 * Placeholder adapter for API-SPORTS. Implement actual fetch/parse in later phase.
 */
export class ApiSportsAdapter extends BaseAdapter {
  sourceKey = "api-sports";
  private options: ApiSportsAdapterOptions;

  constructor(options: ApiSportsAdapterOptions) {
    super();
    this.options = options;
  }

  async fetch(): Promise<unknown> {
    // Budget-gated source. Implementation deferred.
    return [];
  }

  async parse(_raw: unknown): Promise<NormalizedItem[]> {
    return [];
  }
}
