import type { PostgrestError } from "@supabase/supabase-js";

export interface NormalizedItem {
  title: string;
  sourceUrl: string;
  imageUrl?: string;
  excerpt?: string;
  publishedAt?: string | null;
  externalId?: string;
  contentType?: string;
  categories?: string[];
  rawData?: Record<string, any>;
}

export interface ContentAdapter {
  sourceKey: string;
  fetch(): Promise<unknown>;
  parse(raw: unknown): Promise<NormalizedItem[]>;
}

export interface IngestionOptions {
  force?: boolean;
  fetchedAt?: Date;
}

export interface IngestionResult {
  success: boolean;
  runId: string;
  itemsFetched: number;
  itemsCreated: number;
  itemsSkipped: number;
  itemsUpdated: number;
  error?: string;
}

export interface ContentRunRecord {
  id: string;
  source_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ContentSourceRecord {
  id: string;
  source_key: string;
  name: string;
  api_base_url?: string | null;
  is_active: boolean;
  config?: Record<string, any> | null;
  rate_limit_per_hour?: number | null;
}

export interface ContentConfigEntry<T = any> {
  config_key: string;
  config_value: T;
  description?: string | null;
  is_active: boolean;
}

export interface DbResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

export interface InsertContentItemInput {
  source_id: string;
  external_id?: string | null;
  content_hash: string;
  title: string;
  url?: string | null;
  excerpt?: string | null;
  published_at?: string | null;
  image_url?: string | null;
  raw_data?: Record<string, any> | null;
}

export interface UpdateContentItemInput {
  id: string;
  excerpt?: string | null;
  image_url?: string | null;
  raw_data?: Record<string, any> | null;
}

export interface AdapterConstants {
  maxItemsPerRun: number;
  defaultLimit: number;
  [key: string]: number;
}
