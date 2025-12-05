# Spotify OAuth Environment Variables Setup

## Required Environment Variables

### For Supabase Edge Functions (Set in Dashboard)

Go to **Supabase Dashboard → Settings → Edge Functions → Secrets** and add:

1. **VITE_SPOTIFY_CLIENT_ID** (or **SPOTIFY_CLIENT_ID** for backward compatibility)
   - Your Spotify App Client ID
   - Get from: [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Edge Functions accept both names, but `VITE_SPOTIFY_CLIENT_ID` is preferred

2. **SPOTIFY_CLIENT_SECRET**
   - Your Spotify App Client Secret
   - Get from: [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

### For Frontend (Already Configured)

The frontend uses existing environment variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

No additional frontend environment variables needed for Spotify OAuth.

## Quick Setup Steps

1. **Create Spotify App**
   - Go to https://developer.spotify.com/dashboard
   - Click "Create App"
   - Fill in app details
   - Copy **Client ID** and **Client Secret**

2. **Set Redirect URIs in Spotify App**
   
   In your Spotify app settings, add these Redirect URIs:
   
   **Development:**
   ```
   http://localhost:5173/spotify/callback
   ```
   
   **Production:**
   ```
   https://your-domain.com/spotify/callback
   ```
   
   **Edge Function Callback:**
   ```
   https://your-project-ref.supabase.co/functions/v1/spotify-oauth-callback
   ```
   (Replace `your-project-ref` with your actual Supabase project reference)

3. **Set Secrets in Supabase**
   - Go to Supabase Dashboard
   - Navigate to Settings → Edge Functions → Secrets
   - Click "Add New Secret"
   - Add `VITE_SPOTIFY_CLIENT_ID` (or `SPOTIFY_CLIENT_ID` for backward compatibility) with your Client ID
   - Add `SPOTIFY_CLIENT_SECRET` with your Client Secret

4. **Deploy Edge Functions**
   ```bash
   supabase functions deploy spotify-oauth-login
   supabase functions deploy spotify-oauth-callback
   supabase functions deploy spotify-oauth-refresh
   ```

## Verification

After setup, test the OAuth flow:

1. Navigate to `/music/vibe-rooms`
2. Click "Connect Spotify"
3. You should be redirected to Spotify authorization
4. After authorizing, you'll be redirected back to Fluxa
5. The button should show "Spotify Connected"

## Troubleshooting

### Error: "Missing VITE_SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_ID"
- Check that secrets are set in Supabase Dashboard
- Secret names: `VITE_SPOTIFY_CLIENT_ID` (preferred) or `SPOTIFY_CLIENT_ID` (backward compatible), and `SPOTIFY_CLIENT_SECRET`
- Redeploy Edge Functions after adding secrets

### Error: "Invalid redirect_uri"
- Verify redirect URIs in Spotify app settings match exactly
- Include protocol (http/https)
- Include full path (/spotify/callback)
- No trailing slashes

### Error: "Token exchange failed"
- Check Client ID and Secret are correct
- Verify redirect URI matches in Spotify app
- Check Edge Function logs in Supabase Dashboard

## Notes

- Tokens are stored in browser localStorage
- Access tokens expire after 1 hour (auto-refreshed)
- Refresh tokens are long-lived
- Users need Spotify Premium for Web Playback SDK
