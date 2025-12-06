# Spotify Integration Deployment Instructions

## Quick Start

### 1. Verify Configuration

**Check `supabase/config.toml`:**
```toml
project_id = "vzjyclgrqoyxbbzplkgw"
```

### 2. Set Environment Variables

**In Supabase Dashboard → Edge Functions → Secrets:**
```
SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SPOTIFY_CLIENT_ID=<your-spotify-client-id>
SPOTIFY_CLIENT_SECRET=<your-spotify-client-secret>
SPOTIFY_REDIRECT_URI=https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-callback
SPOTIFY_FRONTEND_CALLBACK_URL=https://tryfluxa.vercel.app/api/spotify/callback
FRONTEND_URL=https://tryfluxa.vercel.app
LASTFM_API_KEY=<your-lastfm-api-key>
```

### 3. Deploy Functions

**Option A: Use the deployment script (recommended)**
```powershell
.\scripts\deploy-spotify-functions.ps1
```

**Option B: Deploy all functions individually**
```bash
npx supabase functions deploy spotify-oauth-login --project-ref vzjyclgrqoyxbbzplkgw
npx supabase functions deploy spotify-oauth-refresh --project-ref vzjyclgrqoyxbbzplkgw
npx supabase functions deploy spotify-oauth-callback --project-ref vzjyclgrqoyxbbzplkgw
npx supabase functions deploy search-artists --project-ref vzjyclgrqoyxbbzplkgw
npx supabase functions deploy music-search --project-ref vzjyclgrqoyxbbzplkgw
npx supabase functions deploy music-latest --project-ref vzjyclgrqoyxbbzplkgw
npx supabase functions deploy music-trending --project-ref vzjyclgrqoyxbbzplkgw
npx supabase functions deploy music-trending-searches --project-ref vzjyclgrqoyxbbzplkgw
```

**Option C: Use the deployment script (deploys all functions)**
```powershell
.\scripts\deploy-spotify-functions.ps1
```

**Note:** Supabase CLI doesn't support `--all` flag. Functions must be deployed individually or using a script.

### 4. Verify Deployment

Test each function endpoint:

1. **spotify-oauth-login:**
   ```
   curl -X OPTIONS https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-login
   ```
   Should return: `200 OK` with CORS headers

2. **search-artists:**
   ```
   curl "https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/search-artists?q=ariana"
   ```
   Should return: JSON with artists array

3. **spotify-oauth-callback:**
   - Test by initiating OAuth flow from frontend

### 5. Configure Spotify Dashboard

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Go to **Settings**
4. Add redirect URI:
   ```
   https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-callback
   ```
5. Save changes

### 6. Test Integration

1. **Test Artist Search:**
   - Go to `/music` page
   - Type in search bar
   - Should see artist suggestions

2. **Test Spotify OAuth:**
   - Click "Connect to Spotify" (if available)
   - Should redirect to Spotify login
   - After authorization, should redirect back to app
   - Tokens should be stored in localStorage

3. **Test Token Refresh:**
   - Wait for token to expire (or manually clear access token)
   - Function should automatically refresh using refresh token

---

## Troubleshooting

### Functions Return NOT_FOUND

**Problem:** Functions return 404 when accessed.

**Solution:**
1. Verify project-ref is correct: `vzjyclgrqoyxbbzplkgw`
2. Check functions are deployed to correct project:
   ```bash
   npx supabase functions list --project-ref vzjyclgrqoyxbbzplkgw
   ```
3. Ensure you're using the correct URL format:
   ```
   https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/<function-name>
   ```

### CORS Errors

**Problem:** Browser shows CORS errors.

**Solution:**
1. Verify functions return CORS headers on OPTIONS requests
2. Check `_shared/http.ts` has correct CORS configuration
3. Ensure all functions use shared `corsHeaders`

### OAuth Redirect Fails

**Problem:** Spotify OAuth redirect doesn't work.

**Solution:**
1. Verify redirect URI in Spotify Dashboard matches exactly:
   ```
   https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-callback
   ```
2. Check environment variables are set correctly
3. Review function logs in Supabase Dashboard

### Search Returns Empty Results

**Problem:** Artist search returns no results.

**Solution:**
1. Verify `LASTFM_API_KEY` is set in Supabase secrets
2. Check function logs for errors
3. Test Last.fm API directly to verify API key works

---

## Expected Function URLs

After deployment, these URLs should work:

- ✅ `https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-login`
- ✅ `https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-refresh`
- ✅ `https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-callback`
- ✅ `https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/search-artists`
- ✅ `https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/music-search`
- ✅ `https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/music-latest`
- ✅ `https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/music-trending`
- ✅ `https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/music-trending-searches`

All should return `200 OK` (or redirect) instead of `404 NOT_FOUND`.
