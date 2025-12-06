# Artist Profile 401 Fix - Summary

## Problem
Artist profile endpoint was returning 401 "Missing Supabase credentials" in production, even though:
- Artist profile function only uses Spotify API (doesn't need Supabase)
- Spotify secrets are properly set in both Vercel and Supabase

## Root Cause
The `_shared/env.ts` helper was forcing Supabase env vars to be required globally, even for Spotify-only functions.

## Solution

### 1. Refactored `_shared/env.ts`
- Created `env` object that safely returns empty strings if env vars are missing (no throwing)
- Created `ensureSupabaseEnv()` - only throws 401 if Supabase env vars missing (for functions that need Supabase)
- Created `ensureSpotifyEnv()` - only throws 500 if Spotify env vars missing (for Spotify-only functions)
- Kept `ENV` object for backward compatibility with existing code

### 2. Updated `artist-profile/index.ts`
- ✅ Now uses `ensureSpotifyEnv()` instead of requiring Supabase
- ✅ Uses `env.SPOTIFY_CLIENT_ID`, `env.SPOTIFY_CLIENT_SECRET`, `env.SPOTIFY_API_BASE`
- ✅ Added debug logging to verify env vars without exposing secrets
- ✅ No longer requires Supabase env vars

### 3. Updated `log-artist-search/index.ts`
- ✅ Uses `ensureSupabaseEnv()` since it writes to Supabase database
- ✅ Properly handles Response throws from ensureSupabaseEnv()

### 4. Updated `music-trending-searches/index.ts`
- ✅ Uses `ensureSupabaseEnv()` since it reads from Supabase database
- ✅ Returns empty results gracefully if Supabase env missing

### 5. Verified Spotify-only functions
- ✅ `music-search/index.ts` - Already doesn't use Supabase (no changes needed)
- ✅ `music-latest/index.ts` - Only uses Spotify/curated data (no changes needed)
- ✅ `music-trending/index.ts` - Only uses Spotify/curated data (no changes needed)

## Files Changed

1. ✅ `supabase/functions/_shared/env.ts` - Complete refactor with separated concerns
2. ✅ `supabase/functions/artist-profile/index.ts` - Now Spotify-only, no Supabase requirement
3. ✅ `supabase/functions/log-artist-search/index.ts` - Uses ensureSupabaseEnv()
4. ✅ `supabase/functions/music-trending-searches/index.ts` - Uses ensureSupabaseEnv()

## Deployment Instructions

### 1. Deploy Updated Functions

```bash
supabase functions deploy artist-profile
supabase functions deploy log-artist-search
supabase functions deploy music-trending-searches
```

### 2. Verify Supabase Secrets

Ensure these are set in Supabase Dashboard → Settings → Edge Functions → Secrets:

```
VITE_SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
VITE_SPOTIFY_CLIENT_SECRET=c1ade36db76249139046783aced3d5e0
VITE_SPOTIFY_API_BASE=https://api.spotify.com/v1
VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
VITE_SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

### 3. Force Vercel Clean Build

1. Go to **Vercel Dashboard → Deployments**
2. Click **"Redeploy"** on latest deployment
3. Check **"Redeploy with Build Cache Disabled"**
4. Click **"Redeploy"**

## Expected Results

- ✅ Artist profile endpoint returns data (no 401)
- ✅ Artist search suggestions show images
- ✅ No "Missing Supabase credentials" errors for Spotify-only functions
- ✅ Logging functions still work (they correctly require Supabase)

## Key Changes

**Before:**
- All functions could potentially require Supabase env vars
- Accessing `ENV.VITE_SUPABASE_URL` would throw if missing

**After:**
- `artist-profile` only requires Spotify env vars
- `log-artist-search` explicitly requires Supabase (for database writes)
- Clear separation of concerns via `ensureSupabaseEnv()` vs `ensureSpotifyEnv()`

---

**Status:** ✅ **FIX COMPLETE - Ready for deployment**
