-- Pipeline v2: Cache table for external API responses
create table if not exists fluxa_cache (
  cache_key text primary key,
  value jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists fluxa_cache_expires_idx
on fluxa_cache (expires_at);

-- Enable RLS
alter table fluxa_cache enable row level security;

-- Service role can manage cache
drop policy if exists "Service role can manage cache" on fluxa_cache;
create policy "Service role can manage cache"
on fluxa_cache for all
using (true)
with check (true);

