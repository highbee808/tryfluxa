# Supabase Migration Summary

This document summarizes all changes made to migrate from Lovable's internal Supabase project to a standalone Supabase project.

## Overview

All code has been updated to work with your standalone Supabase project. The migration includes:
- Consolidated database schema migration
- Updated client configuration
- Fixed all function endpoints
- Removed Lovable-specific references

## Files Changed

### 1. Database Migrations

**New File: `supabase/migrations/20251121224543-init.sql`**
- Consolidated all table schemas into a single init migration
- Includes all required tables:
  - `gists` - Main content table
  - `post_analytics` - Engagement metrics
  - `raw_trends` - Trend aggregation
  - `fluxa_memory` - User interaction history
  - `user_favorites` - User favorite gists
  - `user_subniches` - User topic preferences
  - Plus 40+ additional tables for full functionality
- Includes storage bucket creation (`gist-audio`, `fluxa-reactions`)
- Includes all RLS policies, indexes, triggers, and functions
- Includes realtime publication setup

### 2. Client Configuration

**Updated: `src/integrations/supabase/client.ts`**
- Now uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment variables
- Added error handling for missing environment variables
- Compatible with both `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`

### 3. Supabase Configuration

**Updated: `supabase/config.toml`**
- Removed hardcoded Lovable project ID (`zikzuwomznlpgvrftcpf`)
- Project reference now managed via environment variables or Supabase CLI

### 4. Edge Functions

**Updated: `supabase/functions/upload-reactions/index.ts`**
- Removed hardcoded Supabase URL reference
- Now uses environment variable `SUPABASE_URL` dynamically

**All other edge functions** already use environment variables correctly:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Anonymous key for user auth
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

### 5. Function Invocations

All function invocations use the correct format:
- Frontend: `supabase.functions.invoke('function-name', {...})`
- Edge Functions: `${SUPABASE_URL}/functions/v1/function-name`
- Direct fetch: `${VITE_SUPABASE_URL}/functions/v1/function-name`

## Environment Variables Required

Create a `.env.local` file in the project root with:

```env
# Required for frontend
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Required for edge functions (set in Supabase dashboard)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=your-openai-key-here
NEWSAPI_KEY=your-newsapi-key-here
GUARDIAN_API_KEY=your-guardian-key-here
MEDIASTACK_KEY=your-mediastack-key-here
# ... and other API keys as needed
```

## Edge Functions Extracted

The following edge functions have been preserved in `supabase/functions/`:

1. **generate-gist** - Generates gist content from topics
2. **publish-gist** - Publishes gists with audio and images
3. **text-to-speech** - Converts text to speech using OpenAI
4. **scrape-trends** - Aggregates trends from multiple news sources

Plus 40+ additional functions for:
- Sports data sync
- Fan entity management
- Live commentary
- Push notifications
- Chat functionality
- And more...

## Storage Buckets

The following storage buckets are created in the migration:

1. **gist-audio** - Public bucket for audio files
   - Policies: Public read, authenticated upload

2. **fluxa-reactions** - Public bucket for reaction audio files
   - Policies: Public read, authenticated upload

## Database Tables

### Core Tables
- `gists` - Main content/articles
- `post_analytics` - Engagement metrics
- `raw_trends` - Trend data
- `fluxa_memory` - User preferences
- `user_favorites` - User saved content
- `user_subniches` - User topic preferences

### User Management
- `profiles` - User profiles
- `user_roles` - Role-based access control
- `user_interests` - User interests
- `user_teams` - Sports team preferences
- `user_gamification` - Gamification data
- `user_vip` - VIP status
- `user_follows` - User-to-user follows

### Content Tables
- `article_comments` - Comments on gists
- `article_likes` - Likes on gists
- `article_saves` - Saved gists
- `comment_likes` - Likes on comments
- `chat_messages` - Chat history
- `stories` - Story content
- `story_reactions` - Story reactions

### Fan Entities
- `fan_entities` - Teams, artists, etc.
- `fan_posts` - User posts on entity pages
- `fan_entity_stats` - Entity statistics
- `fan_follows` - User follows entities
- `fanbase_threads` - Discussion threads
- `sports_fan_reactions` - Sports reactions

### Live Features
- `live_sessions` - Live audio sessions
- `live_participants` - Session participants
- `live_reactions` - Live reactions
- `rooms` - Audio rooms
- `room_hosts` - Room hosts
- `room_stats` - Room statistics

### Sports
- `match_results` - Sports match data

### Notifications
- `notifications` - User notifications
- `push_subscriptions` - Push notification subscriptions

### System Tables
- `feedback` - User feedback
- `news_cache` - Cached news data
- `fluxa_brain` - AI learning data
- `fluxa_awards` - Weekly awards
- `fluxa_lines` - AI personality lines
- `fluxa_health_log` - Health monitoring
- `voice_chat_history` - Voice chat history
- `achievements` - Achievement definitions
- `user_achievements` - User achievements
- `sponsorships` - Room sponsorships
- `deeper_summary_requests` - Summary requests
- `ai_provider_config` - AI provider settings
- `api_usage_logs` - API usage tracking
- `cost_alert_settings` - Cost monitoring
- `data_monitor_log` - Data quality logs

## Next Steps

1. **Set up your Supabase project:**
   - Create a new project at https://app.supabase.com
   - Get your project URL and keys

2. **Configure environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials
   - Add all required API keys

3. **Run the migration:**
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or apply the migration manually in Supabase dashboard
   ```

4. **Deploy edge functions:**
   ```bash
   # Deploy all functions
   supabase functions deploy
   
   # Or deploy individually
   supabase functions deploy generate-gist
   supabase functions deploy publish-gist
   supabase functions deploy text-to-speech
   supabase functions deploy scrape-trends
   # ... etc
   ```

5. **Set edge function secrets:**
   ```bash
   # Set secrets for edge functions
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
   supabase secrets set OPENAI_API_KEY=your-key
   # ... etc
   ```

6. **Test the application:**
   - Start your dev server
   - Test key functionality
   - Verify database connections
   - Test edge function invocations

## Removed Dependencies

- **LOVABLE_API_KEY** - No longer needed
- **Lovable AI endpoints** - Replaced with OpenAI or your preferred provider
- Hardcoded project references - All now use environment variables

## Notes

- All Lovable-specific API calls should be replaced with OpenAI or your preferred AI provider
- The `lovable-tagger` package in `package.json` is for development only and doesn't affect runtime
- All function endpoints now use the standard Supabase format: `${SUPABASE_URL}/functions/v1/<function-name>`
- Storage bucket policies are configured for public read and authenticated upload

## Verification Checklist

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Database migration applied
- [ ] Storage buckets created
- [ ] Edge functions deployed
- [ ] Edge function secrets set
- [ ] Frontend connects to Supabase
- [ ] Edge functions can be invoked
- [ ] Storage uploads/downloads work
- [ ] Realtime subscriptions work
- [ ] All features tested

## Support

If you encounter issues:
1. Check environment variables are set correctly
2. Verify Supabase project is active
3. Check edge function logs in Supabase dashboard
4. Verify RLS policies are correct
5. Check network requests in browser dev tools

