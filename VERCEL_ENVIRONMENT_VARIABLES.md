# Complete Vercel Environment Variables Checklist

This document lists **ALL** environment variables required in Vercel to ensure every feature works correctly after deployment.

## 🎯 Critical - Required for Basic Functionality

These variables are **essential** - the app will fail without them:

### Frontend Variables (VITE_ prefix required)
These are used by the React frontend and **must** be prefixed with `VITE_` to be exposed to the browser:

| Variable Name | Required | Description | Example |
|--------------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | ✅ **YES** | Your Supabase project URL | `https://vzjyclgrqoyxbbzplkgw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ **YES** | Supabase anonymous key (or use PUBLISHABLE_KEY) | `eyJhbGc...` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ⚠️ Optional | Modern publishable key (alternative to ANON_KEY) | `sb_publishable_...` |
| `VITE_FRONTEND_URL` | ⚠️ Optional | Frontend URL for OAuth redirects | `https://tryfluxa.vercel.app` |

**Note:** If `VITE_FRONTEND_URL` is not set, it will fall back to `window.location.origin` in development.

### Backend Variables (For Supabase Edge Functions)
These are used by Supabase Edge Functions (Deno runtime) and should be set in **Supabase Dashboard** → Project Settings → Edge Functions → Secrets:

| Variable Name | Required | Description | Notes |
|--------------|----------|-------------|-------|
| `SUPABASE_URL` | ✅ **YES** | Same as VITE_SUPABASE_URL (without VITE_ prefix) | Can also use `VITE_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | ✅ **YES** | Same as VITE_SUPABASE_ANON_KEY | Can also use `VITE_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ **YES** | Service role key for admin operations | Also accepts `SB_SERVICE_ROLE_KEY` or `VITE_SUPABASE_SERVICE_ROLE_KEY` |
| `OPENAI_API_KEY` | ✅ **YES** | OpenAI API key for AI features | Used for chat, summaries, gists, etc. |
| `CRON_SECRET` | ✅ **YES** | Secret for cron job authentication | Used by scheduled functions |

## 🎵 Music & Spotify Features

| Variable Name | Required | Where to Set | Description |
|--------------|----------|--------------|-------------|
| `SPOTIFY_CLIENT_ID` | ⚠️ For Spotify OAuth | **Both** Vercel + Supabase Secrets | Spotify app client ID |
| `VITE_SPOTIFY_CLIENT_ID` | ⚠️ Alternative | **Vercel only** | Alternative name (frontend) |
| `SPOTIFY_CLIENT_SECRET` | ⚠️ For Spotify OAuth | **Supabase Secrets only** | Spotify app client secret (never expose to frontend) |
| `SPOTIFY_REDIRECT_URI` | ⚠️ Optional | **Supabase Secrets** | Auto-generated if not set: `{SUPABASE_URL}/functions/v1/spotify-oauth-callback` |
| `SPOTIFY_FRONTEND_CALLBACK_URL` | ⚠️ Optional | **Supabase Secrets** | Defaults to `{FRONTEND_URL}/api/spotify/callback` |
| `LASTFM_API_KEY` | ⚠️ For artist search | **Supabase Secrets** | Also accepts `LAST_FM_API_KEY` |
| `LASTFM_SHARED_SECRET` | ⚠️ Optional | **Supabase Secrets** | For Last.fm authentication |

## 📰 News & Content APIs

| Variable Name | Required | Where to Set | Description |
|--------------|----------|--------------|-------------|
| `NEWSAPI_KEY` | ⚠️ For news content | **Supabase Secrets** | NewsAPI.org API key |
| `GUARDIAN_API_KEY` | ⚠️ For news content | **Supabase Secrets** | The Guardian API key |
| `MEDIASTACK_KEY` | ⚠️ For news content | **Supabase Secrets** | MediaStack API key |
| `STAPIPAL_KEY` | ⚠️ For news content | **Supabase Secrets** | Stapipal API key |
| `RAPIDAPI_KEY` | ⚠️ For RapidAPI integrations | **Supabase Secrets** | RapidAPI key |
| `RAPIDAPI_HOST` | ⚠️ For RapidAPI integrations | **Supabase Secrets** | RapidAPI host |
| `RAPIDAPI_BASE_URL` | ⚠️ Optional | **Supabase Secrets** | RapidAPI base URL |

## ⚽ Sports Features

| Variable Name | Required | Where to Set | Description |
|--------------|----------|--------------|-------------|
| `SPORTSDATA_API_KEY` | ⚠️ For sports data | **Supabase Secrets** | SportsData.io API key |
| `API_FOOTBALL_KEY` | ⚠️ For football/soccer | **Supabase Secrets** | API-Football.com key |
| `SPORTRADAR_KEY` | ⚠️ For sports data | **Supabase Secrets** | SportRadar API key |
| `THESPORTSDB_API_KEY` | ⚠️ Optional | **Supabase Secrets** | TheSportsDB API key |

## 🔧 Optional / Legacy Variables

These have fallbacks or defaults, but can be set for customization:

| Variable Name | Default | Description |
|--------------|---------|-------------|
| `FRONTEND_URL` | `https://tryfluxa.vercel.app` | Frontend URL (backend only, use VITE_FRONTEND_URL for frontend) |
| `VITE_MUSIC_API_PROVIDER` | `lastfm` | Music API provider preference |
| `VITE_MUSIC_API_KEY` | (empty) | Optional music API key |
| `SPOTIFY_AUTH_URL` | `https://accounts.spotify.com/api/token` | Spotify auth endpoint |
| `SPOTIFY_API_BASE` | `https://api.spotify.com/v1` | Spotify API base URL |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `REDDIT_CLIENT_ID` | (empty) | Reddit API client ID |
| `REDDIT_CLIENT_SECRET` | (empty) | Reddit API client secret |

---

## 📋 Quick Setup Checklist

### ✅ Step 1: Vercel Environment Variables
Go to **Vercel Dashboard** → Your Project → Settings → Environment Variables

**Required:**
- [ ] `VITE_SUPABASE_URL` = `https://vzjyclgrqoyxbbzplkgw.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` = (your anon key from Supabase)
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` = (optional, if you have one)
- [ ] `VITE_FRONTEND_URL` = `https://tryfluxa.vercel.app` (or your Vercel URL)

**Optional (Music Features):**
- [ ] `VITE_SPOTIFY_CLIENT_ID` = (if using Spotify OAuth)
- [ ] `VITE_MUSIC_API_PROVIDER` = `lastfm` (default)

### ✅ Step 2: Supabase Edge Function Secrets
Go to **Supabase Dashboard** → Your Project → Settings → Edge Functions → Secrets

**Critical:**
- [ ] `SUPABASE_URL` = `https://vzjyclgrqoyxbbzplkgw.supabase.co`
- [ ] `SUPABASE_ANON_KEY` = (your anon key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (your service role key - **keep secret!**)
- [ ] `OPENAI_API_KEY` = (your OpenAI key)
- [ ] `CRON_SECRET` = (generate a random secret for cron jobs)

**Music Features:**
- [ ] `SPOTIFY_CLIENT_ID` = (Spotify app client ID)
- [ ] `SPOTIFY_CLIENT_SECRET` = (Spotify app client secret)
- [ ] `LASTFM_API_KEY` = (for artist search - **this is why artist search isn't working!**)

**News Features:**
- [ ] `NEWSAPI_KEY` = (if using news content)
- [ ] `GUARDIAN_API_KEY` = (if using Guardian API)
- [ ] `MEDIASTACK_KEY` = (if using MediaStack)
- [ ] `RAPIDAPI_KEY` = (if using RapidAPI)
- [ ] `RAPIDAPI_HOST` = (if using RapidAPI)

**Sports Features:**
- [ ] `SPORTSDATA_API_KEY` = (if using sports features)
- [ ] `API_FOOTBALL_KEY` = (if using football/soccer features)

---

## 🐛 Troubleshooting: Artist Search Not Working

**The artist search issue is likely because `LASTFM_API_KEY` is not set in Supabase Secrets!**

To fix:
1. Get a Last.fm API key from: https://www.last.fm/api/account/create
2. Go to Supabase Dashboard → Settings → Edge Functions → Secrets
3. Add `LASTFM_API_KEY` with your API key
4. Redeploy your Edge Functions (or wait for auto-redeploy)

The `search-artists` Edge Function requires this key to search for artists.

---

## 📝 Notes

1. **VITE_ Prefix:** All frontend variables MUST have `VITE_` prefix to be accessible in the browser
2. **Backend vs Frontend:** Variables without `VITE_` prefix are only available in Edge Functions
3. **Security:** Never expose service role keys or secrets in frontend variables
4. **Redeploy Required:** After adding Vercel env vars, trigger a new deployment
5. **Supabase Secrets:** Edge Function secrets take effect immediately (no redeploy needed)

---

## 🔍 How to Verify Your Setup

After setting all variables, check:

1. **Frontend Connection:**
   - Open browser console on your deployed app
   - Should see no errors about missing `VITE_SUPABASE_URL`

2. **Backend Functions:**
   - Try calling an Edge Function from your app
   - Check Supabase Edge Function logs for errors

3. **Artist Search:**
   - Try searching for an artist in the Music section
   - Check browser console for API errors
   - Check Supabase Edge Function logs for `search-artists` function

---

## ✅ Final Checklist Before Deployment

- [ ] All critical Vercel variables set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] All critical Supabase secrets set (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`)
- [ ] `LASTFM_API_KEY` set in Supabase (for artist search)
- [ ] `VITE_FRONTEND_URL` set in Vercel (for OAuth redirects)
- [ ] Optional variables set if using those features
- [ ] Triggered new Vercel deployment after setting variables
- [ ] Tested artist search after deployment

---

**Last Updated:** Based on codebase analysis as of current date
**Project:** Fluxa
**Supabase Project:** `vzjyclgrqoyxbbzplkgw`
