# Spotify OAuth Login Fix

## Changes Applied

### 1. Fixed Supabase Edge Function (`spotify-oauth-login/index.ts`)

- ✅ Uses `sift` server with route-based serving
- ✅ Returns `307` redirect (temporary redirect that preserves method)
- ✅ Includes full CORS headers to allow browser redirects
- ✅ Reads environment variables at module level for better performance
- ✅ Simplified scopes to required permissions

### 2. Fixed Frontend Login Button (`SpotifyLoginButton.tsx`)

- ✅ Removed `fetch()` call completely (was causing CORS/blocked redirect issues)
- ✅ Now uses simple `window.location.href` navigation
- ✅ Direct navigation to Edge Function URL
- ✅ Browser can follow the redirect naturally

### 3. Environment Variables Required

#### Local Development (`.env.local`)

```env
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
FRONTEND_URL=http://localhost:4173
SPOTIFY_REDIRECT_URI=http://localhost:4173/spotify/callback
```

#### Supabase Edge Functions Secrets

Set these in **Supabase Dashboard → Edge Functions → Secrets**:

```
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
FRONTEND_URL=https://tryfluxa.vercel.app
SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
```

**Note:** For production, use your actual production URL.

## Deployment Steps

1. **Deploy the Edge Function:**

   ```bash
   supabase functions deploy spotify-oauth-login
   ```

2. **Set Environment Variables:**

   - Update `.env.local` with your Spotify Client ID
   - Set secrets in Supabase Dashboard for Edge Functions

3. **Test Locally:**

   ```bash
   npm run dev
   ```

4. **Test the Flow:**

   - Navigate to `/music/vibe-rooms`
   - Click "Connect Spotify"
   - Should redirect to Spotify login screen
   - After authorization, should redirect back with tokens

## How It Works Now

1. User clicks "Connect Spotify" button
2. Browser navigates directly to: `{SUPABASE_URL}/functions/v1/spotify-oauth-login`
3. Edge Function returns `307` redirect to Spotify authorization URL
4. Browser follows redirect to Spotify (no CORS issues)
5. User authorizes on Spotify
6. Spotify redirects to callback URL with authorization code
7. Callback function exchanges code for tokens
8. User redirected back to Fluxa with tokens

## Troubleshooting

### Still Getting CORS Errors?

- Ensure Edge Function is deployed: `supabase functions deploy spotify-oauth-login`
- Check that CORS headers are present in the response
- Verify redirect is using `307` status code

### Redirect Not Working?

- Check `FRONTEND_URL` is set correctly in Supabase secrets
- Verify `SPOTIFY_REDIRECT_URI` matches what's in Spotify Dashboard
- Ensure redirect URI is added to your Spotify app settings

### Missing Client ID Error?

- Check `VITE_SPOTIFY_CLIENT_ID` is set in Supabase Edge Function secrets
- Verify it's also in your `.env.local` for local development

## Success Criteria

✅ Clicking "Connect Spotify" opens Spotify login screen  
✅ No CORS errors in browser console  
✅ No "Failed to fetch" errors  
✅ Redirects work smoothly  
✅ Callback page loads with tokens  
✅ Button shows "Spotify Connected" after authorization
