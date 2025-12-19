/**
 * Admin API Client
 * 
 * Centralized API client for admin observability endpoints.
 * Includes x-admin-secret header from VITE_ADMIN_SECRET environment variable.
 */

// Types for API responses
export interface SourceHealth {
  id: string;
  source_key: string;
  name: string;
  is_active: boolean;
  config: Record<string, any>;
  health: {
    last_success_at: string | null;
    last_error_at: string | null;
    last_error_reason: string | null;
    items_generated_last_run: number;
    consecutive_failures: number;
    last_run_id: string | null;
  } | null;
}

export interface SourcesResponse {
  sources: SourceHealth[];
  total: number;
}

export interface RunResponse {
  id: string;
  source_id: string;
  source_key: string;
  source_name: string;
  status: string;
  items_fetched: number;
  items_created: number;
  items_skipped: number;
  items_updated: number;
  skipped_reason: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface RunsResponse {
  runs: RunResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface OverviewResponse {
  overview: {
    last_cron_window: {
      started_at: string | null;
      sources_processed: number;
      sources_succeeded: number;
      sources_failed: number;
      sources_skipped: number;
      total_items_created: number;
    };
    source_counts: {
      total: number;
      active: number;
      inactive: number;
      healthy: number;
      unhealthy: number;
    };
    recent_runs: Array<{
      source_key: string;
      status: string;
      completed_at: string;
      items_created: number;
      skipped_reason: string | null;
    }>;
  };
}

export interface FeedStatusResponse {
  newestItemAt: string | null;
  activeSourceCount: number;
  lastIngestionAt: string | null;
  sources: Array<{
    source_key: string;
    name: string;
    is_active: boolean;
    item_count: number;
  }>;
}

export interface TriggerResult {
  source_key: string;
  run_id: string;
  items_created: number;
  status: string;
  error: string | null;
}

export interface TriggerResponse {
  success: boolean;
  message: string;
  results?: TriggerResult[];
  execution_time_ms: number;
}

export interface ToggleResponse {
  success: boolean;
  source: SourceHealth;
}

export interface PauseResumeResponse {
  success: boolean;
  ingestion_enabled: boolean;
  message: string;
}

export interface ClearCacheResponse {
  success: boolean;
  message: string;
  cleared: number;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

/**
 * Get admin headers including the admin secret
 */
function getAdminHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const adminSecret = import.meta.env.VITE_ADMIN_SECRET;
  if (adminSecret) {
    headers['x-admin-secret'] = adminSecret;
  }
  
  return headers;
}

/**
 * Make an API request with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        ...getAdminHeaders(),
        ...(options.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!isJson) {
      const text = await res.text();
      return {
        data: null,
        error: {
          error: 'Invalid response',
          message: `Server returned ${contentType} instead of JSON`,
          status: res.status,
        },
      };
    }

    const json = await res.json();

    if (!res.ok) {
      return {
        data: null,
        error: {
          error: json.error || 'Request failed',
          message: json.message || `HTTP ${res.status}`,
          status: res.status,
        },
      };
    }

    return { data: json as T, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: {
        error: 'Network error',
        message: err.message || 'Failed to connect to server',
      },
    };
  }
}

// ============================================================================
// Sources API
// ============================================================================

/**
 * Get all content sources with health status
 */
export async function getSources(): Promise<{ data: SourcesResponse | null; error: ApiError | null }> {
  return apiRequest<SourcesResponse>('/api/admin-observability-sources', {
    method: 'GET',
  });
}

/**
 * Toggle a source's active status
 */
export async function toggleSource(
  source_key: string,
  is_active: boolean
): Promise<{ data: ToggleResponse | null; error: ApiError | null }> {
  return apiRequest<ToggleResponse>('/api/admin-sources-toggle', {
    method: 'POST',
    body: JSON.stringify({ source_key, is_active }),
  });
}

// ============================================================================
// Runs API
// ============================================================================

export interface GetRunsParams {
  source_key?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get ingestion runs with optional filtering
 */
export async function getRuns(
  params: GetRunsParams = {}
): Promise<{ data: RunsResponse | null; error: ApiError | null }> {
  const searchParams = new URLSearchParams();
  if (params.source_key) searchParams.set('source_key', params.source_key);
  if (params.status) searchParams.set('status', params.status);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  
  const queryString = searchParams.toString();
  const url = `/api/admin-observability-runs${queryString ? `?${queryString}` : ''}`;
  
  return apiRequest<RunsResponse>(url, {
    method: 'GET',
  });
}

// ============================================================================
// Overview API
// ============================================================================

/**
 * Get pipeline overview/summary
 */
export async function getOverview(): Promise<{ data: OverviewResponse | null; error: ApiError | null }> {
  return apiRequest<OverviewResponse>('/api/admin-observability-overview', {
    method: 'GET',
  });
}

/**
 * Get feed status (public endpoint, no auth required)
 */
export async function getFeedStatus(): Promise<{ data: FeedStatusResponse | null; error: ApiError | null }> {
  return apiRequest<FeedStatusResponse>('/api/feed-status', {
    method: 'GET',
  });
}

// ============================================================================
// Actions API
// ============================================================================

/**
 * Trigger ingestion for all sources or a specific source
 */
export async function triggerIngestion(
  source_key?: string,
  force: boolean = false
): Promise<{ data: TriggerResponse | null; error: ApiError | null }> {
  return apiRequest<TriggerResponse>('/api/admin-action-trigger-cron', {
    method: 'POST',
    body: JSON.stringify({ source_key, force }),
  });
}

/**
 * Pause all content ingestion
 */
export async function pauseIngestion(): Promise<{ data: PauseResumeResponse | null; error: ApiError | null }> {
  return apiRequest<PauseResumeResponse>('/api/admin-ingestion-pause', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * Resume content ingestion
 */
export async function resumeIngestion(): Promise<{ data: PauseResumeResponse | null; error: ApiError | null }> {
  return apiRequest<PauseResumeResponse>('/api/admin-ingestion-resume', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * Clear feed cache
 */
export async function clearCache(
  source_key?: string
): Promise<{ data: ClearCacheResponse | null; error: ApiError | null }> {
  return apiRequest<ClearCacheResponse>('/api/admin-action-clear-cache', {
    method: 'POST',
    body: JSON.stringify({ source_key }),
  });
}
