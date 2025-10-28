-- Create storage bucket for audio files
insert into storage.buckets (id, name, public)
values ('gist-audio', 'gist-audio', true);

-- Create storage policies for audio files
create policy "Public can view audio files"
on storage.objects for select
using (bucket_id = 'gist-audio');

create policy "Authenticated users can upload audio"
on storage.objects for insert
with check (bucket_id = 'gist-audio' and auth.uid() is not null);

-- Create gists table
create table public.gists (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  context text not null,
  script text not null,
  image_url text,
  audio_url text not null,
  topic text not null,
  published_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Enable RLS on gists
alter table public.gists enable row level security;

-- Public can read all gists (no auth required for viewing)
create policy "Anyone can view published gists"
on public.gists for select
using (true);

-- Create user_interests table (for onboarding preferences)
create table public.user_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  interest text not null,
  created_at timestamp with time zone default now(),
  unique(user_id, interest)
);

-- Enable RLS on user_interests
alter table public.user_interests enable row level security;

-- Users can only see their own interests
create policy "Users can view their own interests"
on public.user_interests for select
using (auth.uid() = user_id);

create policy "Users can insert their own interests"
on public.user_interests for insert
with check (auth.uid() = user_id);

-- Add indexes for performance
create index idx_gists_published_at on public.gists(published_at desc);
create index idx_user_interests_user_id on public.user_interests(user_id);