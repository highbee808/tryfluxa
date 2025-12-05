# Spotify OAuth Login - Deployment Checklist

## ✅ All Code Changes Applied

### 1. Folder Structure
- ✅ Deleted: `supabase/functions/spotify-oauth-login/deno.json`
- ✅ Created: `supabase/functions/spotify-oauth-login/deno.jsonc`
  - Contains `verifyJwt: false` to make function public

### 2. Function Code
- ✅ Updated: `supabase/functions/spotify-oauth-login/index.ts`
  - Uses `sift` server
  - Includes try/catch error handling
  - Returns 307 redirect with full CORS headers
  - No authorization checks

### 3. Frontend Button
- ✅ Updated: `src/components/SpotifyLoginButton.tsx`
  - Uses `window.location.href` for direct browser navigation
  - No fetch() calls

### 4. Global Config
- ✅ Verified: `supabase/config.toml`
  - Contains `[functions.spotify-oauth-login]` with `verify_jwt = false`

## 📋 Pre-Deployment Checklist

### Environment Variables (Local - `.env.local`)
Verify these exist:
```env
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_CLIENT_SECRET=your_secret_here
FRONTEND_URL=http://localhost:4173
SPOTIFY_REDIRECT_URI=http://localhost:4173/spotify/callback
```

### Supabase Secrets (Dashboard)
Go to: **Supabase Dashboard → Edge Functions → Secrets**

Verify these secrets are set:
- `SPOTIFY_CLIENT_ID` (or `VITE_SPOTIFY_CLIENT_ID`)
- `SPOTIFY_CLIENT_SECRET`
- `FRONTEND_URL`
- `SPOTIFY_REDIRECT_URI`

## 🚀 Deployment Command

Run this command to deploy:

```bash
supabase functions deploy spotify-oauth-login --no-verify-jwt
```

Or with local config:

```bash
supabase functions deploy spotify-oauth-login --no-verify-jwt --use-local
```

## ✔️ Post-Deployment Testing

### Test 1: Direct URL
1. Open in browser: `https://<your-project>.supabase.co/functions/v1/spotify-oauth-login`
2. **Expected:** Immediate 307 redirect to Spotify authorization page
3. **Should NOT see:**
   - ❌ 401 error
   - ❌ "Missing authorization header"
   - ❌ JSON error response

### Test 2: From Fluxa App
1. Navigate to `/music/vibe-rooms` in Fluxa
2. Click "Connect Spotify" button
3. **Expected:** Browser opens Spotify login page
4. **Should NOT see:**
   - ❌ "Failed to fetch"
   - ❌ CORS errors
   - ❌ Blocked redirect warnings

### Test 3: Full OAuth Flow
1. Click "Connect Spotify"
2. Authorize on Spotify
3. **Expected:**
   - Redirects to `/spotify/callback`
   - Tokens stored in localStorage
   - Redirects to `/music/vibe-rooms`
   - "Spotify Connected" status shown

## 🔧 Troubleshooting

### If you still get 401:
1. Check `deno.jsonc` exists (not `deno.json`)
2. Verify `verifyJwt: false` in `deno.jsonc`
3. Check `config.toml` has correct section
4. Use `--no-verify-jwt` flag during deployment

### If you get CORS errors:
1. Verify frontend uses `window.location.href` (not `fetch()`)
2. Check function returns CORS headers
3. Ensure 307 redirect status

### If redirect is blocked:
1. Must use browser navigation (`window.location.href`)
2. Cannot use `fetch()` for OAuth redirects
3. Edge Function must return 307 (not 302)

## 📝 Files Modified

- ✅ `supabase/functions/spotify-oauth-login/deno.jsonc` (created)
- ✅ `supabase/functions/spotify-oauth-login/index.ts` (updated)
- ✅ `src/components/SpotifyLoginButton.tsx` (updated)
- ✅ `supabase/config.toml` (already configured)

## ✨ Success Indicators

After successful deployment:
- ✅ No 401 errors
- ✅ No CORS errors
- ✅ Browser redirects work
- ✅ Spotify login page loads
- ✅ Full OAuth flow completes

---

**Ready to deploy!** All code changes are complete. Just verify environment variables and secrets, then run the deployment command.
