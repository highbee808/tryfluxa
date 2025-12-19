# Phase 9: Content Pipeline Observability and Control

This document describes the admin API endpoints for monitoring and controlling the content ingestion pipeline.

## Authentication

All endpoints require the `x-admin-secret` header:

```bash
-H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"
```

The `ADMIN_SECRET` environment variable must be set in production.

---

## Observability Endpoints (Read-Only)

### GET `/api/admin-observability-runs`

List recent ingestion runs with optional filtering and pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `source_key` | string | - | Filter by source key |
| `status` | string | - | Filter by status (completed, failed, running, skipped) |
| `limit` | number | 50 | Max results (max 100) |
| `offset` | number | 0 | Pagination offset |

**Examples:**

Bash/Unix:
```bash
# List last 10 runs
curl -X GET "https://tryfluxa.vercel.app/api/admin-observability-runs?limit=10" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"

# Filter by source
curl -X GET "https://your-app.vercel.app/api/admin-observability-runs?source_key=newsapi-rapidapi" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"

# Filter by status
curl -X GET "https://your-app.vercel.app/api/admin-observability-runs?status=failed" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"
```

PowerShell:
```powershell
# List last 10 runs
Invoke-RestMethod -Uri "https://tryfluxa.vercel.app/api/admin-observability-runs?limit=10" -Method Get -Headers @{"x-admin-secret"="NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"}

# Filter by source
Invoke-RestMethod -Uri "https://tryfluxa.vercel.app/api/admin-observability-runs?source_key=newsapi-rapidapi" -Method Get -Headers @{"x-admin-secret"="NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"}

# Filter by status
Invoke-RestMethod -Uri "https://tryfluxa.vercel.app/api/admin-observability-runs?status=failed" -Method Get -Headers @{"x-admin-secret"="NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"}
```

**Response:**
```json
{
  "runs": [
    {
      "id": "uuid",
      "source_id": "uuid",
      "source_key": "newsapi-rapidapi",
      "source_name": "NewsAPI (RapidAPI)",
      "status": "completed",
      "items_fetched": 25,
      "items_created": 20,
      "items_skipped": 5,
      "items_updated": 0,
      "skipped_reason": null,
      "error_message": null,
      "started_at": "2025-01-21T10:00:00Z",
      "completed_at": "2025-01-21T10:00:05Z"
    }
  ],
  "total": 150,
  "limit": 10,
  "offset": 0
}
```

---

### GET `/api/admin-observability-run`

Get detailed information about a specific run.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | uuid | Yes | Run UUID |

**Example:**
```bash
curl -X GET "https://your-app.vercel.app/api/admin-observability-run?id=<run-uuid>" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"
```

**Response:**
```json
{
  "run": {
    "id": "uuid",
    "source_id": "uuid",
    "source_key": "newsapi-rapidapi",
    "source_name": "NewsAPI (RapidAPI)",
    "status": "completed",
    "items_fetched": 25,
    "items_created": 20,
    "items_skipped": 5,
    "items_updated": 0,
    "skipped_reason": null,
    "error_message": null,
    "started_at": "2025-01-21T10:00:00Z",
    "completed_at": "2025-01-21T10:00:05Z",
    "metadata": {}
  }
}
```

---

### GET `/api/admin-observability-sources`

Get health status for all content sources.

**Examples:**

Bash/Unix:
```bash
curl -X GET "https://your-app.vercel.app/api/admin-observability-sources" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"
```

PowerShell:
```powershell
Invoke-RestMethod -Uri "https://tryfluxa.vercel.app/api/admin-observability-sources" -Method Get -Headers @{"x-admin-secret"="NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"}
```

**Response:**
```json
{
  "sources": [
    {
      "id": "uuid",
      "source_key": "newsapi-rapidapi",
      "name": "NewsAPI (RapidAPI)",
      "is_active": true,
      "config": {},
      "health": {
        "last_success_at": "2025-01-21T10:00:05Z",
        "last_error_at": null,
        "last_error_reason": null,
        "items_generated_last_run": 20,
        "consecutive_failures": 0,
        "last_run_id": "uuid"
      }
    }
  ],
  "total": 5
}
```

---

### GET `/api/admin-observability-overview`

Get high-level pipeline summary.

**Examples:**

Bash/Unix:
```bash
curl -X GET "https://your-app.vercel.app/api/admin-observability-overview" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"
```

PowerShell:
```powershell
Invoke-RestMethod -Uri "https://tryfluxa.vercel.app/api/admin-observability-overview" -Method Get -Headers @{"x-admin-secret"="NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"}
```

**Response:**
```json
{
  "overview": {
    "last_cron_window": {
      "started_at": "2025-01-21T10:00:00Z",
      "sources_processed": 5,
      "sources_succeeded": 4,
      "sources_failed": 0,
      "sources_skipped": 1,
      "total_items_created": 80
    },
    "source_counts": {
      "total": 6,
      "active": 5,
      "inactive": 1,
      "healthy": 4,
      "unhealthy": 1
    },
    "recent_runs": [
      {
        "source_key": "newsapi-rapidapi",
        "status": "completed",
        "completed_at": "2025-01-21T10:00:05Z",
        "items_created": 20,
        "skipped_reason": null
      }
    ]
  }
}
```

---

## Action Endpoints (Write)

### POST `/api/admin-action-trigger-cron`

Manually trigger the ingestion pipeline.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_key` | string | No | Run specific source only |
| `force` | boolean | No | Ignore freshness window (default: false) |

**Examples:**

Bash/Unix:
```bash
# Trigger all active sources
curl -X POST "https://your-app.vercel.app/api/admin-action-trigger-cron" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM" \
  -H "Content-Type: application/json" \
  -d '{}'

# Trigger specific source
curl -X POST "https://your-app.vercel.app/api/admin-action-trigger-cron" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM" \
  -H "Content-Type: application/json" \
  -d '{"source_key": "newsapi-rapidapi"}'

# Trigger with force (ignore freshness)
curl -X POST "https://your-app.vercel.app/api/admin-action-trigger-cron" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM" \
  -H "Content-Type: application/json" \
  -d '{"source_key": "newsapi-rapidapi", "force": true}'
```

PowerShell:
```powershell
# Trigger all active sources
Invoke-RestMethod -Uri "https://tryfluxa.vercel.app/api/admin-action-trigger-cron" -Method Post -Headers @{"x-admin-secret"="NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"; "Content-Type"="application/json"} -Body '{}'

# Trigger specific source
Invoke-RestMethod -Uri "https://tryfluxa.vercel.app/api/admin-action-trigger-cron" -Method Post -Headers @{"x-admin-secret"="NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"; "Content-Type"="application/json"} -Body '{"source_key": "newsapi-rapidapi"}'

# Trigger with force (ignore freshness)
Invoke-RestMethod -Uri "https://tryfluxa.vercel.app/api/admin-action-trigger-cron" -Method Post -Headers @{"x-admin-secret"="NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"; "Content-Type"="application/json"} -Body '{"source_key": "newsapi-rapidapi", "force": true}'
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 5 source(s): 4 succeeded, 1 failed",
  "results": [
    {
      "source_key": "newsapi-rapidapi",
      "run_id": "uuid",
      "items_created": 20,
      "status": "success",
      "error": null
    }
  ],
  "execution_time_ms": 5432
}
```

---

### POST `/api/admin-action-force-refresh`

Force refresh a specific source, ignoring the freshness window.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_key` | string | Yes | Source to refresh |

**Examples:**

Bash/Unix:
```bash
curl -X POST "https://your-app.vercel.app/api/admin-action-force-refresh" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM" \
  -H "Content-Type: application/json" \
  -d '{"source_key": "newsapi-rapidapi"}'
```

PowerShell:
```powershell
Invoke-RestMethod -Uri "https://tryfluxa.vercel.app/api/admin-action-force-refresh" -Method Post -Headers @{"x-admin-secret"="NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"; "Content-Type"="application/json"} -Body '{"source_key": "newsapi-rapidapi"}'
```

**Response:**
```json
{
  "success": true,
  "run_id": "uuid",
  "items_fetched": 25,
  "items_created": 20,
  "items_skipped": 5,
  "message": "Successfully refreshed newsapi-rapidapi: 20 items created"
}
```

---

### POST `/api/admin-action-clear-cache`

Clear feed cache (safe operation, no data deletion).

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_key` | string | No | Scope to specific source |

**Examples:**

Bash/Unix:
```bash
curl -X POST "https://your-app.vercel.app/api/admin-action-clear-cache" \
  -H "x-admin-secret: NEW68DE6BA1ED9113AA26C725EA4C926ADNIM" \
  -H "Content-Type: application/json" \
  -d '{}'
```

PowerShell:
```powershell
Invoke-RestMethod -Uri "https://tryfluxa.vercel.app/api/admin-action-clear-cache" -Method Post -Headers @{"x-admin-secret"="NEW68DE6BA1ED9113AA26C725EA4C926ADNIM"; "Content-Type"="application/json"} -Body '{}'
```

**Response:**
```json
{
  "success": true,
  "message": "Cleared 15 expired cache entries",
  "cleared": 15
}
```

---

## Understanding Skip Reasons

When content runs are skipped, the `skipped_reason` field indicates why:

| Reason | Description |
|--------|-------------|
| `cadence` | Freshness window not met (e.g., source was run < 3 hours ago) |
| `disabled` | Source is marked as inactive in content_sources |
| `budget_exceeded` | API budget limit reached for the source |
| `no_data` | API returned no content |

---

## Database Tables

### `content_runs` (enhanced)

| Column | Type | Description |
|--------|------|-------------|
| `skipped_reason` | TEXT | Why the run was skipped (cadence, disabled, budget_exceeded, no_data) |

### `content_source_health` (new)

| Column | Type | Description |
|--------|------|-------------|
| `source_id` | UUID | Reference to content_sources |
| `last_success_at` | TIMESTAMPTZ | Last successful run timestamp |
| `last_error_at` | TIMESTAMPTZ | Last failed run timestamp |
| `last_error_reason` | TEXT | Error message from last failure |
| `items_generated_last_run` | INTEGER | Items created in last run |
| `consecutive_failures` | INTEGER | Count of consecutive failures |
| `last_run_id` | UUID | Reference to last run |

---

## Troubleshooting

### "Why didn't content show today?"

1. Check `/api/admin-observability-overview` for last cron window status
2. Check `/api/admin-observability-runs?status=failed` for recent failures
3. Check `/api/admin-observability-sources` for unhealthy sources

### "Which sources worked, which didn't?"

1. Use `/api/admin-observability-sources` to see health status
2. Filter runs by status: `?status=completed` vs `?status=failed`

### Force a refresh

Use `/api/admin-action-force-refresh` with the source key to bypass cadence checks.
