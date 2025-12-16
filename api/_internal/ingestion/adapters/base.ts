import type { ContentAdapter, NormalizedItem } from "../types";

export abstract class BaseAdapter implements ContentAdapter {
  abstract sourceKey: string;
  abstract fetch(): Promise<unknown>;
  abstract parse(raw: unknown): Promise<NormalizedItem[]>;

  protected normalizeUrl(url: string | null | undefined): string {
    if (!url) return "";
    try {
      const normalized = new URL(url);
      normalized.hash = "";
      return normalized.toString();
    } catch {
      return url;
    }
  }

  protected parseDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
}
