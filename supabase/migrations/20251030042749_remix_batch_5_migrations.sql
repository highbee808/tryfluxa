
-- Migration: 20251028183426
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

-- Migration: 20251029025139
-- Create feedback table for MVP testers
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT NOT NULL,
  page_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (public MVP testing)
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can view all feedback (for admin panel)
CREATE POLICY "Authenticated users can view all feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index on created_at for faster sorting
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);

-- Migration: 20251029220023
-- Create chat_messages table for storing chat conversations
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view all chat messages (public chat)
CREATE POLICY "Anyone can view chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert chat messages
CREATE POLICY "Anyone can insert chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster conversation queries
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Migration: 20251030015611
-- Add missing columns to gists table
ALTER TABLE public.gists 
ADD COLUMN IF NOT EXISTS narration TEXT,
ADD COLUMN IF NOT EXISTS topic_category TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published', 'failed')),
ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- Update existing records to have published status
UPDATE public.gists SET status = 'published' WHERE status IS NULL;

-- Create index for fast fetching
CREATE INDEX IF NOT EXISTS idx_gists_status_published ON public.gists(status, published_at DESC);

-- Update RLS policies for gists table
DROP POLICY IF EXISTS "Anyone can view published gists" ON public.gists;

CREATE POLICY "Anyone can view published gists" 
ON public.gists 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Service role can insert gists" 
ON public.gists 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update gists" 
ON public.gists 
FOR UPDATE 
USING (true);

-- Migration: 20251030021324
-- Create role enum for user access control
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table to manage user permissions
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create security definer function to check user roles
-- This prevents recursive RLS issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update gists table RLS policy to require admin role for insert
CREATE POLICY "Only admins can insert gists"
ON public.gists
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
