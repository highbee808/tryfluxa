-- ============================================
-- FLUXA INITIAL DATABASE SCHEMA
-- Consolidated migration for standalone Supabase project
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Create role enum for user access control
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for entity categories
CREATE TYPE public.fan_entity_category AS ENUM ('sports', 'music', 'culture');

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('gist-audio', 'gist-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for reactions
INSERT INTO storage.buckets (id, name, public)
VALUES ('fluxa-reactions', 'fluxa-reactions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gist-audio bucket
CREATE POLICY IF NOT EXISTS "Public can view audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'gist-audio');

CREATE POLICY IF NOT EXISTS "Authenticated users can upload audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gist-audio' AND auth.uid() IS NOT NULL);

-- Storage policies for fluxa-reactions bucket
CREATE POLICY IF NOT EXISTS "Public can view reaction files"
ON storage.objects FOR SELECT
USING (bucket_id = 'fluxa-reactions');

CREATE POLICY IF NOT EXISTS "Authenticated users can upload reactions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fluxa-reactions' AND auth.uid() IS NOT NULL);

-- ============================================
-- CORE TABLES
-- ============================================

-- Create gists table
CREATE TABLE IF NOT EXISTS public.gists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline TEXT NOT NULL,
  context TEXT NOT NULL,
  script TEXT NOT NULL,
  narration TEXT,
  image_url TEXT,
  audio_url TEXT NOT NULL,
  topic TEXT NOT NULL,
  topic_category TEXT,
  source_url TEXT,
  news_published_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published', 'failed')),
  play_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  meta JSONB DEFAULT '{}'::jsonb,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create post_analytics table for real-time engagement tracking
CREATE TABLE IF NOT EXISTS public.post_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  plays INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id)
);

-- Create raw_trends table to store aggregated trends from multiple APIs
CREATE TABLE IF NOT EXISTS public.raw_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- Create fluxa_memory table to store user interaction history
CREATE TABLE IF NOT EXISTS public.fluxa_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  gist_history JSONB DEFAULT '[]'::jsonb,
  favorite_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_gist_played TEXT,
  preferred_time TEXT,
  streak_count INTEGER DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_favorites table for tracking liked gists
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gist_id UUID REFERENCES public.gists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gist_id)
);

-- Create user_subniches table
CREATE TABLE IF NOT EXISTS public.user_subniches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  main_topic TEXT NOT NULL,
  sub_niches TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- FAN ENTITIES TABLES
-- ============================================

-- Create fan_entities table for teams, artists, etc.
CREATE TABLE IF NOT EXISTS public.fan_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category public.fan_entity_category NOT NULL,
  logo_url TEXT,
  background_url TEXT,
  bio TEXT,
  api_id TEXT,
  api_source TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  achievements JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb,
  current_match JSONB,
  last_match JSONB,
  next_match JSONB,
  upcoming_events JSONB,
  news_feed JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fan_posts table for user posts on entity pages
CREATE TABLE IF NOT EXISTS public.fan_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.fan_entities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  reaction_count INTEGER DEFAULT 0,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fan_entity_stats table for live data
CREATE TABLE IF NOT EXISTS public.fan_entity_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.fan_entities(id) ON DELETE CASCADE NOT NULL,
  stat_type TEXT NOT NULL,
  stat_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(entity_id, stat_type)
);

-- Create fan_follows table for user follows
CREATE TABLE IF NOT EXISTS public.fan_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_id UUID REFERENCES public.fan_entities(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, entity_id)
);

-- ============================================
-- USER MANAGEMENT TABLES
-- ============================================

-- Create user_roles table to manage user permissions
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_interests table (for onboarding preferences)
CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, interest)
);

-- Create user_teams table
CREATE TABLE IF NOT EXISTS public.user_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  favorite_teams TEXT[],
  rival_teams TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_gamification table
CREATE TABLE IF NOT EXISTS public.user_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  posts_read INTEGER DEFAULT 0,
  likes_given INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_vip table
CREATE TABLE IF NOT EXISTS public.user_vip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  vip_status BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_follows table (user-to-user follows)
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create user_conversations table
CREATE TABLE IF NOT EXISTS public.user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CONTENT TABLES
-- ============================================

-- Create article_comments table
CREATE TABLE IF NOT EXISTS public.article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.gists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.article_comments(id) ON DELETE CASCADE,
  likes_count INTEGER NOT NULL DEFAULT 0,
  is_reported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create article_likes table
CREATE TABLE IF NOT EXISTS public.article_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(article_id, user_id)
);

-- Create article_saves table
CREATE TABLE IF NOT EXISTS public.article_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(article_id, user_id)
);

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.article_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create chat_messages table for storing chat conversations
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  image_url TEXT,
  gist_id UUID REFERENCES public.gists(id) ON DELETE SET NULL,
  duration INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create story_reactions table
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fanbase_threads table
CREATE TABLE IF NOT EXISTS public.fanbase_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  post TEXT NOT NULL,
  user_id UUID,
  audio_url TEXT,
  reactions JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sports_fan_reactions table
CREATE TABLE IF NOT EXISTS public.sports_fan_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team TEXT NOT NULL,
  reaction TEXT NOT NULL,
  match_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- LIVE SESSION TABLES
-- ============================================

-- Create live_sessions table
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  host_id UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  replay_audio_url TEXT,
  chat_history JSONB DEFAULT '[]'::jsonb,
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create live_participants table
CREATE TABLE IF NOT EXISTS public.live_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT DEFAULT 'listener' CHECK (role IN ('listener', 'co-host')),
  is_speaking BOOLEAN DEFAULT false,
  hand_raised BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create live_reactions table
CREATE TABLE IF NOT EXISTS public.live_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  topic_category TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  active_listeners INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create room_hosts table
CREATE TABLE IF NOT EXISTS public.room_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create room_stats table
CREATE TABLE IF NOT EXISTS public.room_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_listeners INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,
  session_length INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- SPORTS TABLES
-- ============================================

-- Create match_results table
CREATE TABLE IF NOT EXISTS public.match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL UNIQUE,
  league TEXT NOT NULL,
  team_home TEXT NOT NULL,
  team_away TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  score_home INTEGER,
  score_away INTEGER,
  status TEXT NOT NULL,
  round TEXT,
  venue TEXT,
  referee TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- NOTIFICATION TABLES
-- ============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  gist_id UUID REFERENCES public.gists(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.fan_entities(id) ON DELETE CASCADE,
  entity_name TEXT,
  entity_image TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- ADMIN & SYSTEM TABLES
-- ============================================

-- Create feedback table for MVP testers
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT NOT NULL,
  page_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create news_cache table
CREATE TABLE IF NOT EXISTS public.news_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL,
  news_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fluxa_brain table
CREATE TABLE IF NOT EXISTS public.fluxa_brain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  topics_read JSONB DEFAULT '[]'::jsonb,
  total_reads INTEGER DEFAULT 0,
  avg_read_time NUMERIC DEFAULT 0,
  reading_speed TEXT DEFAULT 'normal',
  preferred_tone TEXT DEFAULT 'friendly',
  engagement_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fluxa_awards table
CREATE TABLE IF NOT EXISTS public.fluxa_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  top_gister_id TEXT,
  fluxa_fan_id TEXT,
  hot_topic_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  announced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fluxa_lines table
CREATE TABLE IF NOT EXISTS public.fluxa_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line TEXT NOT NULL,
  category TEXT NOT NULL,
  mood TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fluxa_health_log table
CREATE TABLE IF NOT EXISTS public.fluxa_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create voice_chat_history table
CREATE TABLE IF NOT EXISTS public.voice_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_message TEXT NOT NULL,
  fluxa_reply TEXT NOT NULL,
  emotion TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  tier TEXT,
  points_required INTEGER,
  activity_type TEXT,
  activity_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create sponsorships table
CREATE TABLE IF NOT EXISTS public.sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  ad_copy TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  impressions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create deeper_summary_requests table
CREATE TABLE IF NOT EXISTS public.deeper_summary_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  article_id UUID NOT NULL,
  status TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ai_provider_config table
CREATE TABLE IF NOT EXISTS public.ai_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL UNIQUE,
  priority INTEGER NOT NULL,
  cost_per_1k_tokens NUMERIC NOT NULL,
  rate_limit INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fallback_provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create api_usage_logs table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  endpoint TEXT NOT NULL,
  provider TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  estimated_cost NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create cost_alert_settings table
CREATE TABLE IF NOT EXISTS public.cost_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_limit NUMERIC NOT NULL,
  alert_threshold NUMERIC NOT NULL,
  current_month_cost NUMERIC NOT NULL DEFAULT 0,
  last_reset TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create data_monitor_log table
CREATE TABLE IF NOT EXISTS public.data_monitor_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.fan_entities(id) ON DELETE SET NULL,
  entity_name TEXT,
  check_type TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  severity TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  action_taken TEXT NOT NULL,
  auto_fixed BOOLEAN,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Gists indexes
CREATE INDEX IF NOT EXISTS idx_gists_published_at ON public.gists(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_gists_status_published ON public.gists(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_gists_topic_category ON public.gists(topic_category);

-- Post analytics indexes
CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id ON public.post_analytics(post_id);

-- Raw trends indexes
CREATE INDEX IF NOT EXISTS idx_raw_trends_created_at ON public.raw_trends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_trends_processed ON public.raw_trends(processed);
CREATE INDEX IF NOT EXISTS idx_raw_trends_category ON public.raw_trends(category);

-- User interests indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);

-- Fan entities indexes
CREATE INDEX IF NOT EXISTS idx_fan_entities_slug ON public.fan_entities(slug);
CREATE INDEX IF NOT EXISTS idx_fan_entities_category ON public.fan_entities(category);
CREATE INDEX IF NOT EXISTS idx_fan_posts_entity_id ON public.fan_posts(entity_id);
CREATE INDEX IF NOT EXISTS idx_fan_posts_user_id ON public.fan_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_fan_posts_created_at ON public.fan_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fan_follows_user_id ON public.fan_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_fan_follows_entity_id ON public.fan_follows(entity_id);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Comment indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent_id ON public.article_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_article_id ON public.article_comments(article_id);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Match results indexes
CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON public.match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_match_date ON public.match_results(match_date DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.gists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxa_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subniches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_entity_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fanbase_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_fan_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxa_brain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxa_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxa_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxa_health_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deeper_summary_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_monitor_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Gists policies
CREATE POLICY IF NOT EXISTS "Anyone can view published gists"
ON public.gists FOR SELECT
USING (status = 'published');

CREATE POLICY IF NOT EXISTS "Service role can insert gists"
ON public.gists FOR INSERT
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role can update gists"
ON public.gists FOR UPDATE
USING (true);

-- Post analytics policies
CREATE POLICY IF NOT EXISTS "Anyone can view post analytics"
ON public.post_analytics FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage analytics"
ON public.post_analytics FOR ALL
USING (true);

-- Raw trends policies
CREATE POLICY IF NOT EXISTS "Service role can manage raw_trends"
ON public.raw_trends FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can view raw_trends"
ON public.raw_trends FOR SELECT
USING (true);

-- Fluxa memory policies
CREATE POLICY IF NOT EXISTS "Users can view own memory"
ON public.fluxa_memory FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own memory"
ON public.fluxa_memory FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own memory"
ON public.fluxa_memory FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own memory"
ON public.fluxa_memory FOR DELETE
USING (auth.uid() = user_id);

-- User favorites policies
CREATE POLICY IF NOT EXISTS "Users can view own favorites"
ON public.user_favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own favorites"
ON public.user_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own favorites"
ON public.user_favorites FOR DELETE
USING (auth.uid() = user_id);

-- User subniches policies
CREATE POLICY IF NOT EXISTS "Users can view own subniches"
ON public.user_subniches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own subniches"
ON public.user_subniches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own subniches"
ON public.user_subniches FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own subniches"
ON public.user_subniches FOR DELETE
USING (auth.uid() = user_id);

-- Fan entities policies
CREATE POLICY IF NOT EXISTS "Anyone can view fan entities"
ON public.fan_entities FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage entities"
ON public.fan_entities FOR ALL
USING (true);

-- Fan posts policies
CREATE POLICY IF NOT EXISTS "Anyone can view fan posts"
ON public.fan_posts FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert own posts"
ON public.fan_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own posts"
ON public.fan_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own posts"
ON public.fan_posts FOR DELETE
USING (auth.uid() = user_id);

-- Fan entity stats policies
CREATE POLICY IF NOT EXISTS "Anyone can view entity stats"
ON public.fan_entity_stats FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage stats"
ON public.fan_entity_stats FOR ALL
USING (true);

-- Fan follows policies
CREATE POLICY IF NOT EXISTS "Users can view all follows"
ON public.fan_follows FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Users can manage own follows"
ON public.fan_follows FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own follows"
ON public.fan_follows FOR DELETE
USING (auth.uid() = user_id);

-- User roles policies
CREATE POLICY IF NOT EXISTS "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Profiles policies
CREATE POLICY IF NOT EXISTS "Anyone can view profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User interests policies
CREATE POLICY IF NOT EXISTS "Users can view their own interests"
ON public.user_interests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own interests"
ON public.user_interests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Article comments policies
CREATE POLICY IF NOT EXISTS "Anyone can view comments"
ON public.article_comments FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert comments"
ON public.article_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own comments"
ON public.article_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own comments"
ON public.article_comments FOR DELETE
USING (auth.uid() = user_id);

-- Comment likes policies
CREATE POLICY IF NOT EXISTS "Anyone can view comment likes"
ON public.comment_likes FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Users can like comments"
ON public.comment_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can unlike comments"
ON public.comment_likes FOR DELETE
USING (auth.uid() = user_id);

-- Article likes policies
CREATE POLICY IF NOT EXISTS "Anyone can view article likes"
ON public.article_likes FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Users can like articles"
ON public.article_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can unlike articles"
ON public.article_likes FOR DELETE
USING (auth.uid() = user_id);

-- Article saves policies
CREATE POLICY IF NOT EXISTS "Users can view own saves"
ON public.article_saves FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can save articles"
ON public.article_saves FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can unsave articles"
ON public.article_saves FOR DELETE
USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY IF NOT EXISTS "Anyone can view chat messages"
ON public.chat_messages FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can insert chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (true);

-- Stories policies
CREATE POLICY IF NOT EXISTS "Anyone can view stories"
ON public.stories FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage stories"
ON public.stories FOR ALL
USING (true);

-- Story reactions policies
CREATE POLICY IF NOT EXISTS "Anyone can view story reactions"
ON public.story_reactions FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Users can react to stories"
ON public.story_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fanbase threads policies
CREATE POLICY IF NOT EXISTS "Anyone can view fanbase threads"
ON public.fanbase_threads FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can insert threads"
ON public.fanbase_threads FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY IF NOT EXISTS "Users can update own threads"
ON public.fanbase_threads FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY IF NOT EXISTS "Users can delete own threads"
ON public.fanbase_threads FOR DELETE
USING (auth.uid() = user_id);

-- Sports fan reactions policies
CREATE POLICY IF NOT EXISTS "Users can view all reactions"
ON public.sports_fan_reactions FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert own reactions"
ON public.sports_fan_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own reactions"
ON public.sports_fan_reactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own reactions"
ON public.sports_fan_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Live sessions policies
CREATE POLICY IF NOT EXISTS "Anyone can view live or scheduled sessions"
ON public.live_sessions FOR SELECT
USING (status IN ('live', 'scheduled'));

CREATE POLICY IF NOT EXISTS "Service role can manage sessions"
ON public.live_sessions FOR ALL
USING (true) WITH CHECK (true);

-- Live participants policies
CREATE POLICY IF NOT EXISTS "Users can view session participants"
ON public.live_participants FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Users can join sessions"
ON public.live_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own participation"
ON public.live_participants FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can leave sessions"
ON public.live_participants FOR DELETE
USING (auth.uid() = user_id);

-- Live reactions policies
CREATE POLICY IF NOT EXISTS "Users can view reactions"
ON public.live_reactions FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Users can send reactions"
ON public.live_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Rooms policies
CREATE POLICY IF NOT EXISTS "Anyone can view rooms"
ON public.rooms FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage rooms"
ON public.rooms FOR ALL
USING (true);

-- Room hosts policies
CREATE POLICY IF NOT EXISTS "Anyone can view room hosts"
ON public.room_hosts FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage room hosts"
ON public.room_hosts FOR ALL
USING (true);

-- Room stats policies
CREATE POLICY IF NOT EXISTS "Anyone can view room stats"
ON public.room_stats FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage room stats"
ON public.room_stats FOR ALL
USING (true);

-- Match results policies
CREATE POLICY IF NOT EXISTS "Anyone can view match results"
ON public.match_results FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage match results"
ON public.match_results FOR ALL
USING (true);

-- Notifications policies
CREATE POLICY IF NOT EXISTS "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Push subscriptions policies
CREATE POLICY IF NOT EXISTS "Users can manage own subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id);

-- Feedback policies
CREATE POLICY IF NOT EXISTS "Anyone can submit feedback"
ON public.feedback FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can view all feedback"
ON public.feedback FOR SELECT
TO authenticated
USING (true);

-- News cache policies
CREATE POLICY IF NOT EXISTS "Anyone can view news cache"
ON public.news_cache FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage news cache"
ON public.news_cache FOR ALL
USING (true);

-- Fluxa brain policies
CREATE POLICY IF NOT EXISTS "Users can view own brain"
ON public.fluxa_brain FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage own brain"
ON public.fluxa_brain FOR ALL
USING (auth.uid() = user_id);

-- Voice chat history policies
CREATE POLICY IF NOT EXISTS "Users can view own voice history"
ON public.voice_chat_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own voice history"
ON public.voice_chat_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY IF NOT EXISTS "Anyone can view achievements"
ON public.achievements FOR SELECT
USING (true);

CREATE POLICY IF NOT EXISTS "Service role can manage achievements"
ON public.achievements FOR ALL
USING (true);

-- User achievements policies
CREATE POLICY IF NOT EXISTS "Users can view own achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can manage user achievements"
ON public.user_achievements FOR ALL
USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate favorite category from gist history
CREATE OR REPLACE FUNCTION get_favorite_category(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  fav_category TEXT;
BEGIN
  SELECT topic_category
  INTO fav_category
  FROM (
    SELECT 
      jsonb_array_elements(gist_history)->>'topic' as topic_category,
      COUNT(*) as play_count
    FROM fluxa_memory
    WHERE user_id = user_uuid
    GROUP BY topic_category
    ORDER BY play_count DESC
    LIMIT 1
  ) as categories;
  
  RETURN fav_category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security definer function to check user roles
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

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE article_comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE article_comments 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update post analytics comment count
CREATE OR REPLACE FUNCTION update_post_analytics_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO post_analytics (post_id, comments)
    VALUES (NEW.article_id, 1)
    ON CONFLICT (post_id) 
    DO UPDATE SET 
      comments = post_analytics.comments + 1,
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_analytics 
    SET 
      comments = GREATEST(comments - 1, 0),
      updated_at = now()
    WHERE post_id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update post analytics likes count
CREATE OR REPLACE FUNCTION update_post_analytics_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO post_analytics (post_id, likes)
    VALUES (NEW.article_id::uuid, 1)
    ON CONFLICT (post_id) 
    DO UPDATE SET 
      likes = post_analytics.likes + 1,
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_analytics 
    SET 
      likes = GREATEST(likes - 1, 0),
      updated_at = now()
    WHERE post_id = OLD.article_id::uuid;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to increment post analytics
CREATE OR REPLACE FUNCTION increment_post_analytics(
  p_post_id UUID,
  p_field TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS void AS $$
BEGIN
  INSERT INTO post_analytics (post_id, views, likes, comments, shares, plays)
  VALUES (
    p_post_id,
    CASE WHEN p_field = 'views' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'likes' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'comments' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'shares' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'plays' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (post_id) 
  DO UPDATE SET
    views = CASE WHEN p_field = 'views' THEN post_analytics.views + p_increment ELSE post_analytics.views END,
    likes = CASE WHEN p_field = 'likes' THEN post_analytics.likes + p_increment ELSE post_analytics.likes END,
    comments = CASE WHEN p_field = 'comments' THEN post_analytics.comments + p_increment ELSE post_analytics.comments END,
    shares = CASE WHEN p_field = 'shares' THEN post_analytics.shares + p_increment ELSE post_analytics.shares END,
    plays = CASE WHEN p_field = 'plays' THEN post_analytics.plays + p_increment ELSE post_analytics.plays END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to update fluxa_memory updated_at
CREATE OR REPLACE FUNCTION update_fluxa_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update fan entities updated_at
CREATE OR REPLACE FUNCTION update_fan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- This function can be expanded to check various achievement criteria
  -- For now, it's a placeholder
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for comment likes
DROP TRIGGER IF EXISTS trigger_update_comment_likes ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- Trigger for post analytics comments
DROP TRIGGER IF EXISTS trigger_update_post_analytics_comments ON article_comments;
CREATE TRIGGER trigger_update_post_analytics_comments
  AFTER INSERT OR DELETE ON article_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_analytics_comments();

-- Trigger for post analytics likes
DROP TRIGGER IF EXISTS trigger_update_post_analytics_likes ON article_likes;
CREATE TRIGGER trigger_update_post_analytics_likes
  AFTER INSERT OR DELETE ON article_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_analytics_likes();

-- Trigger for fluxa_memory updated_at
DROP TRIGGER IF EXISTS trigger_update_fluxa_memory_updated_at ON fluxa_memory;
CREATE TRIGGER trigger_update_fluxa_memory_updated_at
  BEFORE UPDATE ON fluxa_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_fluxa_memory_updated_at();

-- Trigger for fan entities updated_at
DROP TRIGGER IF EXISTS update_fan_entities_updated_at ON fan_entities;
CREATE TRIGGER update_fan_entities_updated_at
  BEFORE UPDATE ON fan_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_fan_updated_at();

-- Trigger for fan posts updated_at
DROP TRIGGER IF EXISTS update_fan_posts_updated_at ON fan_posts;
CREATE TRIGGER update_fan_posts_updated_at
  BEFORE UPDATE ON fan_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_fan_updated_at();

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.gists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.article_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fan_entities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_chat_history;

-- Set replica identity for tables that need it
ALTER TABLE public.fan_entities REPLICA IDENTITY FULL;
ALTER TABLE public.sports_fan_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.fanbase_threads REPLICA IDENTITY FULL;

