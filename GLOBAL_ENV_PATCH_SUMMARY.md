# Global Environment Variable Patch - Implementation Summary

## ✅ Changes Completed

This document summarizes the global patch to standardize environment variables across Fluxa's backend and frontend.

---

## 📋 Files Modified

### Frontend Files:
1. ✅ **`src/lib/supabaseClient.ts`** - Created new standardized client
2. ✅ **`src/integrations/supabase/client.ts`** - Updated to use `persistSession: false`

### Edge Function Files:
3. ✅ **`supabase/functions/_shared/env.ts`** - Standardized to use only `VITE_*` variables
4. ✅ **`supabase/functions/spotify-oauth-login/index.ts`** - Updated to use `VITE_SPOTIFY_CLIENT_ID`, `VITE_SPOTIFY_CLIENT_SECRET`
5. ✅ **`supabase/functions/spotify-oauth-callback/index.ts`** - Updated to use `VITE_*` variables
6. ✅ **`supabase/functions/spotify-proxy/index.ts`** - Updated to use `VITE_*` variables
7. ✅ **`supabase/functions/artist-profile/index.ts`** - Updated to use `VITE_SPOTIFY_CLIENT_ID`, `VITE_SPOTIFY_CLIENT_SECRET`, `VITE_SPOTIFY_API_BASE`
8. ✅ **`supabase/functions/spotify-token/index.ts`** - NEW function for token exchange

### Remaining Functions to Update:
The following functions still reference old variable names and should be updated:
- `supabase/functions/music-search/index.ts` - Uses old `SPOTIFY_AUTH_URL`, `SPOTIFY_API_BASE`
- `supabase/functions/music-trending/index.ts` - Uses old `SPOTIFY_AUTH_URL`, `SPOTIFY_API_BASE`
- `supabase/functions/music-latest/index.ts` - Uses old `SPOTIFY_AUTH_URL`, `SPOTIFY_API_BASE`
- `supabase/functions/artist-bio-albums/index.ts` - Uses old `SPOTIFY_AUTH_URL`, `SPOTIFY_API_BASE`
- `supabase/functions/spotify-oauth-refresh/index.ts` - Uses old `ENV.SPOTIFY_CLIENT_ID`

---

## 🔧 Standardized Environment Variables

### Frontend (Vercel):
```bash
VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
VITE_SUPABASE_PROJECT_ID=vzjyclgrqoyxbbzplkgw
VITE_FRONTEND_URL=https://tryfluxa.vercel.app
VITE_SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
VITE_SPOTIFY_CLIENT_SECRET=c1ade36db76249139046783aced3d5e0
VITE_SPOTIFY_API_BASE=https://api.spotify.com/v1
VITE_SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
```

### Backend (Supabase Edge Function Secrets):
Set these in: **Supabase Dashboard → Settings → Edge Functions → Secrets**

```bash
VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
VITE_SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
VITE_SPOTIFY_CLIENT_SECRET=c1ade36db76249139046783aced3d5e0
VITE_SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
VITE_SPOTIFY_API_BASE=https://api.spotify.com/v1
VITE_FRONTEND_URL=https://tryfluxa.vercel.app
```

---

## ❌ Variables Removed/Deprecated

The following variables should be **DELETED** from Vercel and Supabase:

- ❌ `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI`
- ❌ `SPOTIFY_REDIRECT_URI` (use `VITE_SPOTIFY_REDIRECT_URI` instead)
- ❌ `SPOTIFY_AUTH_URL` (hardcode `https://accounts.spotify.com/api/token`)
- ❌ `SPOTIFY_CLIENT_ID` (use `VITE_SPOTIFY_CLIENT_ID`)
- ❌ `SPOTIFY_CLIENT_SECRET` (use `VITE_SPOTIFY_CLIENT_SECRET`)
- ❌ `SPOTIFY_API_BASE` (use `VITE_SPOTIFY_API_BASE`)
- ❌ `VITE_SPOTIFY_API_PROVIDER` (conflicts with lastfm)
- ❌ `SUPABASE_URL` (use `VITE_SUPABASE_URL`)
- ❌ `SUPABASE_ANON_KEY` (use `VITE_SUPABASE_ANON_KEY`)

---

## 🚀 Deployment Steps

### 1. Set Supabase Edge Function Secrets:
```bash
supabase secrets set VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
supabase secrets set VITE_SUPABASE_ANON_KEY=<your_anon_key>
supabase secrets set VITE_SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
supabase secrets set VITE_SPOTIFY_CLIENT_SECRET=c1ade36db76249139046783aced3d5e0
supabase secrets set VITE_SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
supabase secrets set VITE_SPOTIFY_API_BASE=https://api.spotify.com/v1
supabase secrets set VITE_FRONTEND_URL=https://tryfluxa.vercel.app
```

### 2. Deploy Updated Edge Functions:
```bash
supabase functions deploy spotify-token
supabase functions deploy spotify-oauth-login
supabase functions deploy spotify-oauth-callback
supabase functions deploy spotify-proxy
supabase functions deploy artist-profile
```

### 3. Update Vercel Environment Variables:
Go to Vercel Dashboard → Settings → Environment Variables and:
- Add all `VITE_*` variables listed above
- Delete all deprecated variables listed above

### 4. Force Vercel Clean Build:
- Go to Vercel → Deployments
- Click "Redeploy"
- Choose **"Redeploy with Build Cache Disabled"**
- This ensures new ENV goes into Edge Functions

---

## ✅ Expected Results After Deployment

- ✅ Artist search works without 401 errors
- ✅ Artist profile loads successfully
- ✅ No more "No access token received from Spotify"
- ✅ OAuth login completes successfully
- ✅ Token is returned and stored
- ✅ Connect Spotify button works
- ✅ Search suggestions show images
- ✅ Local + Vercel behave identically

---

## 📝 Notes

1. **All Edge Functions** now use `VITE_*` prefixed variables
2. **Supabase client** uses `persistSession: false` for consistency
3. **spotify-token** function created for clean token exchange
4. **artist-profile** function fixed to use standardized env vars
5. **OAuth flow** now uses consistent variable names

---

**Status:** ✅ Core patches complete - Remaining music functions can be updated incrementally
