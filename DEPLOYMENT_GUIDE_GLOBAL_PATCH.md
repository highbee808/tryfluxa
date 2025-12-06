# Global Environment Variable Patch - Deployment Guide

## ✅ Patch Complete - Ready for Deployment

All critical fixes have been applied. Follow these steps to deploy.

---

## 🔧 Step 1: Set Supabase Edge Function Secrets

Run these commands to set all required secrets in Supabase:

```bash
supabase secrets set VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
supabase secrets set VITE_SUPABASE_ANON_KEY=<your_anon_key_here>
supabase secrets set VITE_SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
supabase secrets set VITE_SPOTIFY_CLIENT_SECRET=c1ade36db76249139046783aced3d5e0
supabase secrets set VITE_SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
supabase secrets set VITE_SPOTIFY_API_BASE=https://api.spotify.com/v1
supabase secrets set VITE_FRONTEND_URL=https://tryfluxa.vercel.app
```

**Replace `<your_anon_key_here>` with your actual Supabase anon key.**

---

## 🚀 Step 2: Deploy Updated Edge Functions

Deploy all updated functions:

```bash
supabase functions deploy spotify-token
supabase functions deploy spotify-oauth-login
supabase functions deploy spotify-oauth-callback
supabase functions deploy spotify-proxy
supabase functions deploy artist-profile
supabase functions deploy music-search
supabase functions deploy music-trending
supabase functions deploy music-latest
supabase functions deploy artist-bio-albums
supabase functions deploy spotify-oauth-refresh
```

---

## 🔄 Step 3: Update Vercel Environment Variables

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Add These (REQUIRED):
```
VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
VITE_SUPABASE_PROJECT_ID=vzjyclgrqoyxbbzplkgw
VITE_FRONTEND_URL=https://tryfluxa.vercel.app
VITE_SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
VITE_SPOTIFY_CLIENT_SECRET=c1ade36db76249139046783aced3d5e0
VITE_SPOTIFY_API_BASE=https://api.spotify.com/v1
VITE_SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
```

### Delete These (DEPRECATED):
- ❌ `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI`
- ❌ `SPOTIFY_REDIRECT_URI`
- ❌ `SPOTIFY_AUTH_URL`
- ❌ `SPOTIFY_CLIENT_ID`
- ❌ `SPOTIFY_CLIENT_SECRET`
- ❌ `SPOTIFY_API_BASE`
- ❌ `VITE_SPOTIFY_API_PROVIDER`
- ❌ `SUPABASE_URL` (if exists)
- ❌ `SUPABASE_ANON_KEY` (if exists)

---

## 🧹 Step 4: Force Vercel Clean Build

1. Go to **Vercel Dashboard → Deployments**
2. Click **"Redeploy"** on the latest deployment
3. Select **"Redeploy with Build Cache Disabled"**
4. Click **"Redeploy"**

This ensures the new environment variables are baked into the build.

---

## ✅ Step 5: Verify Deployment

After deployment completes, test:

- [ ] Artist search works (no 401 errors)
- [ ] Artist profile page loads
- [ ] "Connect Spotify" button works
- [ ] OAuth flow completes successfully
- [ ] Token is stored in localStorage
- [ ] Search suggestions show artist images
- [ ] No console errors about missing env vars

---

## 📋 Summary of Changes

### Files Created:
- ✅ `src/lib/supabaseClient.ts` - Standardized Supabase client
- ✅ `supabase/functions/spotify-token/index.ts` - New token exchange function
- ✅ `GLOBAL_ENV_PATCH_SUMMARY.md` - Implementation summary
- ✅ `DEPLOYMENT_GUIDE_GLOBAL_PATCH.md` - This file

### Files Modified:
- ✅ `src/integrations/supabase/client.ts` - Updated to `persistSession: false`
- ✅ `supabase/functions/_shared/env.ts` - Standardized to `VITE_*` only
- ✅ `supabase/functions/spotify-oauth-login/index.ts` - Uses `VITE_*` vars
- ✅ `supabase/functions/spotify-oauth-callback/index.ts` - Uses `VITE_*` vars
- ✅ `supabase/functions/spotify-oauth-refresh/index.ts` - Uses `VITE_*` vars
- ✅ `supabase/functions/spotify-proxy/index.ts` - Uses `VITE_*` vars
- ✅ `supabase/functions/artist-profile/index.ts` - Fixed 401, uses `VITE_*` vars
- ✅ `supabase/functions/music-search/index.ts` - Uses `VITE_*` vars
- ✅ `supabase/functions/music-trending/index.ts` - Uses `VITE_*` vars
- ✅ `supabase/functions/music-latest/index.ts` - Uses `VITE_*` vars
- ✅ `supabase/functions/artist-bio-albums/index.ts` - Uses `VITE_*` vars
- ✅ `supabase/config.toml` - Added spotify-token config

---

## 🐛 Troubleshooting

### "401 Unauthorized" on artist-profile:
- Check that `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_CLIENT_SECRET` are set in Supabase Secrets
- Verify secrets with: `supabase secrets list`

### "No access token received from Spotify":
- Verify `VITE_SPOTIFY_REDIRECT_URI` matches Spotify Dashboard settings
- Check that `VITE_SPOTIFY_CLIENT_ID` is correct in both Vercel and Supabase

### Environment variables not loading:
- Ensure all `VITE_*` variables are set in Vercel
- Redeploy with build cache disabled
- Check browser console for specific missing variable errors

---

**Status:** ✅ Ready for deployment
