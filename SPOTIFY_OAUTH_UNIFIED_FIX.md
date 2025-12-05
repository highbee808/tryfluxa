# Spotify OAuth Unified Fix - Complete Guide

## ✅ All Code Changes Applied

### 1. Shared Environment Variables (`supabase/functions/_shared/env.ts`)
- ✅ Added unified exports:
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - `FRONTEND_URL` (defaults to `https://tryfluxa.vercel.app`)
  - `SPOTIFY_REDIRECT_URI` (derived from `FRONTEND_URL`)

### 2. Spotify OAuth Login Function (`supabase/functions/spotify-oauth-login/index.ts`)
- ✅ Updated to use Deno `0.208.0`
- ✅ Uses shared environment variables
- ✅ Simplified code (no CORS preflight needed)
- ✅ Returns 307 redirect to Spotify

### 3. Spotify OAuth Callback Function (`supabase/functions/spotify-oauth-callback/index.ts`)
- ✅ Updated to use Deno `0.208.0`
- ✅ Uses unified `SPOTIFY_REDIRECT_URI` from shared env
- ✅ Removed hardcoded Supabase URLs
- ✅ Uses `FRONTEND_URL` for redirect

### 4. Frontend Login Button (`src/components/SpotifyLoginButton.tsx`)
- ✅ Already uses `window.location.href` (no fetch)
- ✅ Direct browser navigation for OAuth

## 📋 Next Steps

### Step 1: Update `.env.local`

See `SPOTIFY_OAUTH_ENV_SETUP.md` for details.

**Required values:**
```env
VITE_SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
FRONTEND_URL=https://tryfluxa.vercel.app
SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
```

### Step 2: Update Supabase Secrets

See `SPOTIFY_OAUTH_SUPABASE_SECRETS.md` for details.

**Required secrets:**
- `SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189`
- `SPOTIFY_CLIENT_SECRET=<keep existing>`
- `FRONTEND_URL=https://tryfluxa.vercel.app`
- `SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback`

### Step 3: Verify Spotify Developer Dashboard

Ensure redirect URI is registered:
- Go to: https://developer.spotify.com/dashboard
- Select your app
- Settings → Redirect URIs
- Add/verify: `https://tryfluxa.vercel.app/spotify/callback`

### Step 4: Deploy Edge Functions

```bash
supabase functions deploy spotify-oauth-login --no-verify-jwt
supabase functions deploy spotify-oauth-callback --no-verify-jwt
```

## ✅ Success Criteria

After completing all steps:

1. ✅ **Chrome/Firefox compatibility:** Works in both browsers
2. ✅ **No INVALID_CLIENT errors:** Redirect URI matches everywhere
3. ✅ **No CORS errors:** Browser navigates directly
4. ✅ **No "Failed to fetch":** Uses `window.location.href`
5. ✅ **Callback works:** Code → tokens exchange successful
6. ✅ **Unified redirect URI:** `https://tryfluxa.vercel.app/spotify/callback` everywhere

## 🔍 Verification Checklist

- [ ] `.env.local` updated with correct values
- [ ] Supabase secrets updated
- [ ] Spotify Developer Dashboard has redirect URI registered
- [ ] Edge functions deployed successfully
- [ ] Test "Connect Spotify" button
- [ ] Verify redirect to Spotify login works
- [ ] Verify callback returns tokens successfully

## 🐛 Troubleshooting

### Still getting "INVALID_CLIENT: Invalid redirect URI"?

1. Check Spotify Developer Dashboard redirect URI matches exactly
2. Check Supabase secret `SPOTIFY_REDIRECT_URI` matches
3. Check `.env.local` has correct `SPOTIFY_REDIRECT_URI`
4. Ensure no trailing slashes
5. Case-sensitive - must be lowercase

### CORS errors?

1. Frontend must use `window.location.href` (not fetch)
2. Check browser console for errors
3. Clear browser cache

### Deployment errors?

1. Ensure Deno version is `0.208.0`
2. Check function uses shared env imports
3. Verify `deno.jsonc` has `verifyJwt: false`

## 📝 Files Modified

- ✅ `supabase/functions/_shared/env.ts` - Added unified exports
- ✅ `supabase/functions/spotify-oauth-login/index.ts` - Updated to use shared env
- ✅ `supabase/functions/spotify-oauth-callback/index.ts` - Updated to use shared env
- ✅ `src/components/SpotifyLoginButton.tsx` - Already correct (uses `window.location.href`)

## 🎯 Unified Redirect URI

**Everywhere it's used, the redirect URI is:**
```
https://tryfluxa.vercel.app/spotify/callback
```

This ensures:
- Spotify accepts the redirect
- Backend functions use the same URI
- Frontend redirects correctly
- No INVALID_CLIENT errors
