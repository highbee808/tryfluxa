---
name: Fluxa Content System Database Migrations
overview: Create database schema for Fluxa's content ingestion system with 8 core tables supporting multi-source ingestion, global deduplication via SHA-256 hashing, per-user seen tracking, admin configuration, API budgeting, and ingestion observability.
todos: []
---

# Phase 1: Database Migrations - Fluxa Content System

## Overview

This plan creates a production-ready database schema for Fluxa's content ingestion system. The schema supports:

- Multi-source content ingestion from APIs (NewsAPI, Guardian, Mediastack, etc.)
- Global deduplication via SHA-256 content hashing
- Per-user content seen tracking (no repeats)
- Admin-controlled configuration
- API usage budgeting and tracking
- Ingestion run observability
- Content categorization

The schema coexists with existing `gists` and `raw_trends` tables.

---

## Migration Strategy

**Migration File:** `supabase/migrations/20250115000000_content_ingestion_system.sql`

**Approach:** Single consolidated migration with clear sections for rollback safety.

**Order:** Dependencies first (sources, config, categories) → Core tables (items, runs) → Tracking tables (user_seen, usage) → Indexes and constraints.

---

## Table Schemas

### 1. content_sources

**Purpose:** Registry of API endpoints that provide content (NewsAPI, Guardian API, Mediastack, etc.)

**Columns:**

- `id` UUID PRIMARY KEY (gen_random_uuid())
- `source_key` TEXT NOT NULL UNIQUE (e.g., 'newsapi', 'guardian', 'mediastack')
- `name` TEXT NOT NULL (display name, e.g., 'NewsAPI')
- `api_base_url` TEXT (base URL for API, nullable)
- `is_active` BOOLEAN DEFAULT true (admin can disable sources)
- `config` JSONB DEFAULT '{}' (flexible source-specific config)
- `rate_limit_per_hour` INTEGER (optional rate limit)
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**Indexes:**

- UNIQUE on `source_key`
- Index on `is_active` (for active source filtering)

**Seed Data:** NewsAPI, Guardian API, Mediastack

---

### 2. content_categories

**Purpose:** Categorization system for content (many-to-many with content_items)

**Columns:**

- `id` UUID PRIMARY KEY (gen_random_uuid())
- `name` TEXT NOT NULL UNIQUE (e.g., 'Technology', 'Sports', 'Entertainment')
- `slug` TEXT NOT NULL UNIQUE (normalized name for URLs)
- `description` TEXT (optional description)
- `is_active` BOOLEAN DEFAULT true
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**Indexes:**

- UNIQUE on `name` and `slug`
- Index on `is_active`

**Seed Data:** Common categories (Technology, Sports, Entertainment, Politics, Business, etc.)

---

### 3. content_items

**Purpose:** Core content storage with global deduplication via content_hash

**Columns:**

- `id` UUID PRIMARY KEY (gen_random_uuid())
- `source_id` UUID NOT NULL REFERENCES content_sources(id) ON DELETE RESTRICT
- `external_id` TEXT (nullable; API-specific ID/URL for updates, flexible format; used only for updates, NOT deduplication)
- `content_hash` TEXT NOT NULL UNIQUE (SHA-256 hash for global deduplication)
- `title` TEXT NOT NULL (raw, original title from source; preserves display fidelity; normalization is a derived value used only in hashing utility)
- `url` TEXT (canonical URL to source article)
- `excerpt` TEXT (content excerpt/summary)
- `published_at` TIMESTAMPTZ (canonical published time, hour precision for hash)
- `image_url` TEXT (featured image URL)
- `raw_data` JSONB DEFAULT '{}' (store full API response for debugging)
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**Indexes:**

- UNIQUE on `content_hash` (critical for deduplication)
- Index on `source_id` (for source-based queries)
- Index on `external_id` (for updates via external_id; nullable but indexed for lookups)
- Index on `published_at` (for time-based queries)
- Composite index on `(source_id, external_id)` (for source+external_id lookups; nulls handled by PostgreSQL)

**Hash Generation Logic (application-level):**

```
normalized_title = normalize(title)  // Derived from raw title, not stored
hash_input = normalized_title + "|" + source_key + "|" + truncate_to_hour(published_at)
content_hash = SHA-256(hash_input).hexdigest()
```

**Important Notes:**

- `title` stores the **raw, original title** from the source for display fidelity
- Normalization is a **derived value** computed in the hashing utility only
- This allows future normalization algorithm changes without data loss
- `content_hash` enforces global deduplication. Same story from different sources is allowed (different hash). Same story fetched twice from same source = ignored (duplicate hash).
- `external_id` is nullable (some sources don't provide stable IDs) and used only for updates, NOT deduplication

---

### 4. content_item_categories

**Purpose:** Many-to-many relationship between content_items and content_categories

**Columns:**

- `id` UUID PRIMARY KEY (gen_random_uuid())
- `content_item_id` UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE
- `category_id` UUID NOT NULL REFERENCES content_categories(id) ON DELETE CASCADE
- `created_at` TIMESTAMPTZ DEFAULT now()

**Indexes:**

- UNIQUE on `(content_item_id, category_id)` (prevent duplicates)
- Index on `category_id` (for category-based queries)
- Index on `content_item_id` (for item queries)

---

### 5. content_runs

**Purpose:** Track ingestion runs for observability (when, what source, results)

**Columns:**

- `id` UUID PRIMARY KEY (gen_random_uuid())
- `source_id` UUID NOT NULL REFERENCES content_sources(id) ON DELETE RESTRICT
- `status` TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled'))
- `items_fetched` INTEGER DEFAULT 0 (raw count from API)
- `items_created` INTEGER DEFAULT 0 (new items inserted)
- `items_skipped` INTEGER DEFAULT 0 (duplicates skipped)
- `items_updated` INTEGER DEFAULT 0 (existing items updated)
- `error_message` TEXT (if status = 'failed')
- `started_at` TIMESTAMPTZ DEFAULT now()
- `completed_at` TIMESTAMPTZ (nullable, set when finished)
- `metadata` JSONB DEFAULT '{}' (run-specific data: query params, API response codes, etc.)

**Indexes:**

- Index on `source_id` (for source-based run queries)
- Index on `status` (for filtering active/failed runs)
- Index on `started_at` (for time-based queries)
- Composite index on `(source_id, started_at)` (for source history)

---

### 6. user_content_seen

**Purpose:** Per-user tracking to prevent showing same content twice (composite PK: user_id, content_id)

**Columns:**

- `user_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- `content_item_id` UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE
- `seen_at` TIMESTAMPTZ DEFAULT now() (when user first saw this content)
- `interacted` BOOLEAN DEFAULT false (optional: did user interact?)
- `interacted_at` TIMESTAMPTZ (nullable, when user interacted)

**Constraints:**

- PRIMARY KEY on `(user_id, content_item_id)` (composite PK enforces uniqueness)
- NOT NULL on both columns

**Indexes:**

- Primary key already indexes `(user_id, content_item_id)`
- Index on `user_id` (for user feed queries)
- Index on `seen_at` (for recency queries)

**Note:** Composite primary key ensures each user can only have one record per content item.

---

### 7. content_config

**Purpose:** Admin-controlled configuration (no hard-coded values)

**Columns:**

- `id` UUID PRIMARY KEY (gen_random_uuid())
- `config_key` TEXT NOT NULL UNIQUE (e.g., 'ingestion.enabled', 'deduplication.hash_algorithm')
- `config_value` JSONB NOT NULL (flexible value: string, number, boolean, object, array)
- `description` TEXT (what this config controls)
- `is_active` BOOLEAN DEFAULT true
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**Indexes:**

- UNIQUE on `config_key`
- Index on `is_active` (for active config queries)

**Seed Data:**

- `ingestion.enabled`: true
- `deduplication.hash_algorithm`: "sha256"
- `ingestion.max_items_per_run`: 100
- `ingestion.default_categories`: ["Technology", "Sports", "Entertainment"]

---

### 8. api_usage_budget

**Purpose:** Track API usage and budgets per source

**Columns:**

- `id` UUID PRIMARY KEY (gen_random_uuid())
- `source_id` UUID NOT NULL REFERENCES content_sources(id) ON DELETE RESTRICT
- `period_start` TIMESTAMPTZ NOT NULL (start of budget period)
- `period_end` TIMESTAMPTZ NOT NULL (end of budget period)
- `budget_limit` INTEGER (max requests/calls for period, nullable = unlimited)
- `usage_count` INTEGER DEFAULT 0 (current usage this period)
- `last_reset_at` TIMESTAMPTZ DEFAULT now() (when usage was last reset)
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**Indexes:**

- Index on `source_id` (for source-based budget queries)
- Index on `(source_id, period_start, period_end)` (for period lookups)
- Index on `period_start`, `period_end` (for active period queries)

**Note:** Budgets are tracked per source per period. Application logic resets usage_count when period expires.

---

## Migration Steps

### Step 1: Create content_sources table

- Create table with all columns, constraints, indexes
- No dependencies

**Rollback:** `DROP TABLE IF EXISTS content_sources CASCADE;`

---

### Step 2: Create content_categories table

- Create table with all columns, constraints, indexes
- No dependencies

**Rollback:** `DROP TABLE IF EXISTS content_categories CASCADE;`

---

### Step 3: Create content_items table

- Create table with foreign key to content_sources
- Add unique constraint on content_hash
- Add all indexes
- **Depends on:** Step 1 (content_sources)

**Rollback:** `DROP TABLE IF EXISTS content_items CASCADE;`

---

### Step 4: Create content_item_categories table

- Create table with foreign keys to content_items and content_categories
- Add unique constraint on (content_item_id, category_id)
- **Depends on:** Step 3 (content_items), Step 2 (content_categories)

**Rollback:** `DROP TABLE IF EXISTS content_item_categories CASCADE;`

---

### Step 5: Create content_runs table

- Create table with foreign key to content_sources
- Add status check constraint
- Add all indexes
- **Depends on:** Step 1 (content_sources)

**Rollback:** `DROP TABLE IF EXISTS content_runs CASCADE;`

---

### Step 6: Create user_content_seen table

- Create table with composite primary key (user_id, content_item_id)
- Add foreign keys to auth.users and content_items
- Add indexes
- **Depends on:** Step 3 (content_items), auth.users exists

**Rollback:** `DROP TABLE IF EXISTS user_content_seen CASCADE;`

---

### Step 7: Create content_config table

- Create table with unique constraint on config_key
- Add indexes
- No dependencies

**Rollback:** `DROP TABLE IF EXISTS content_config CASCADE;`

---

### Step 8: Create api_usage_budget table

- Create table with foreign key to content_sources
- Add indexes for period queries
- **Depends on:** Step 1 (content_sources)

**Rollback:** `DROP TABLE IF EXISTS api_usage_budget CASCADE;`

---

### Step 9: Seed content_sources

- Insert seed data for NewsAPI, Guardian API, Mediastack
- Use `INSERT ... ON CONFLICT DO NOTHING` for idempotency

**Seed Data:**

```sql
INSERT INTO content_sources (source_key, name, api_base_url, is_active, config) VALUES
  ('newsapi', 'NewsAPI', 'https://newsapi.org/v2', true, '{"requires_auth": true}'),
  ('guardian', 'The Guardian API', 'https://content.guardianapis.com', true, '{"requires_auth": true}'),
  ('mediastack', 'Mediastack', 'http://api.mediastack.com/v1', true, '{"requires_auth": true}');
```

---

### Step 10: Seed content_categories

- Insert seed data for common categories
- Use `INSERT ... ON CONFLICT DO NOTHING` for idempotency

**Seed Data:**

```sql
INSERT INTO content_categories (name, slug, description) VALUES
  ('Technology', 'technology', 'Tech news and innovations'),
  ('Sports', 'sports', 'Sports news and updates'),
  ('Entertainment', 'entertainment', 'Entertainment industry news'),
  ('Politics', 'politics', 'Political news and analysis'),
  ('Business', 'business', 'Business and financial news'),
  ('Science', 'science', 'Scientific discoveries and research'),
  ('Health', 'health', 'Health and wellness news'),
  ('World', 'world', 'International news');
```

---

### Step 11: Seed content_config

- Insert default configuration values
- Use `INSERT ... ON CONFLICT DO UPDATE` for idempotency

**Seed Data:**

```sql
INSERT INTO content_config (config_key, config_value, description) VALUES
  ('ingestion.enabled', 'true'::jsonb, 'Enable/disable content ingestion'),
  ('deduplication.hash_algorithm', '"sha256"'::jsonb, 'Hash algorithm for content deduplication'),
  ('ingestion.max_items_per_run', '100'::jsonb, 'Maximum items to fetch per ingestion run'),
  ('ingestion.default_categories', '["Technology", "Sports", "Entertainment"]'::jsonb, 'Default categories for content'),
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();
```

---

### Step 12: Enable RLS (Row Level Security)

- Enable RLS on all tables
- Create policies as needed (for now, service role access only; user policies in Phase 2)

**Tables to enable RLS:**

- content_sources
- content_items
- content_categories
- content_item_categories
- content_runs
- user_content_seen (users can only see their own records)
- content_config (admin-only)
- api_usage_budget (admin-only)

**Note:** Detailed RLS policies can be added in a follow-up migration. For Phase 1, basic service role access is sufficient.

---

## Validation Checklist

After migrations run successfully, verify:

- [ ] All 8 tables exist: `content_sources`, `content_items`, `content_runs`, `user_content_seen`, `content_config`, `api_usage_budget`, `content_categories`, `content_item_categories`
- [ ] All primary keys are UUIDs
- [ ] `content_items.content_hash` has UNIQUE constraint
- [ ] `user_content_seen` has composite PRIMARY KEY on `(user_id, content_item_id)`
- [ ] All foreign keys have proper ON DELETE rules:
  - `content_items.source_id` → RESTRICT
  - `content_item_categories` → CASCADE
  - `user_content_seen.content_item_id` → CASCADE
  - `user_content_seen.user_id` → CASCADE
- [ ] All timestamps are TIMESTAMPTZ
- [ ] All indexes are created (check `pg_indexes` for each table)
- [ ] Seed data exists in `content_sources` (3 records: newsapi, guardian, mediastack)
- [ ] Seed data exists in `content_categories` (8+ categories)
- [ ] Seed data exists in `content_config` (4+ config keys)
- [ ] RLS is enabled on all tables
- [ ] No hard-coded values (all config in `content_config` table)

---

## Rollback Strategy

If migration needs to be rolled back:

1. **Order matters (reverse dependency order):**
   ```sql
   DROP TABLE IF EXISTS user_content_seen CASCADE;
   DROP TABLE IF EXISTS content_item_categories CASCADE;
   DROP TABLE IF EXISTS content_runs CASCADE;
   DROP TABLE IF EXISTS api_usage_budget CASCADE;
   DROP TABLE IF EXISTS content_items CASCADE;
   DROP TABLE IF EXISTS content_config CASCADE;
   DROP TABLE IF EXISTS content_categories CASCADE;
   DROP TABLE IF EXISTS content_sources CASCADE;
   ```

2. **Safe approach:** Wrap entire migration in a transaction (Supabase migrations are transactional by default).

---

## Future Considerations (Not in Phase 1)

- RLS policies for user access
- Triggers for `updated_at` timestamps
- Materialized views for analytics
- Full-text search indexes on `content_items.title` and `content_items.excerpt`
- Partitioning for `content_items` by date (if scale requires)
- Soft deletes (add `deleted_at` column if needed)

---

## File Structure

**Migration File:** `supabase/migrations/20250115000000_content_ingestion_system.sql`

**Organization:**

- Section headers for each table
- Comments explaining constraints and indexes
- Seed data in separate section
- Clear dependency order