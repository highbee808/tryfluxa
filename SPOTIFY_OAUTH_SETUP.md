# Spotify OAuth Setup Guide

This guide explains how to set up Spotify OAuth for the Vibe Rooms feature in Fluxa.

## Overview

Spotify OAuth allows users to connect their Spotify Premium accounts to Fluxa, enabling synchronized music playback in Vibe Rooms. Each user plays music through their own Spotify app, and Fluxa coordinates playback timing.

## Prerequisites

1. **Spotify Developer Account**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app or use an existing one
   - Note your **Client ID** and **Client Secret**

2. **Spotify Premium Account** (required for Web Playback SDK)
   - Users must have Spotify Premium to use Vibe Rooms
   - Free tier users cannot use the Web Playback SDK

## Environment Variables

### Frontend (.env.local)

Add these variables to your `.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Edge Functions Secrets

Go to **Supabase Dashboard → Settings → Edge Functions → Secrets** and add:

```env
VITE_SPOTIFY_CLIENT_ID=your-spotify-client-id
# Or use SPOTIFY_CLIENT_ID for backward compatibility
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

⚠️ **Important**: These secrets must be set in the Supabase Dashboard, not in `.env.local`. Edge Functions run on Supabase servers and don't have access to local environment files.

## Spotify App Configuration

1. **Redirect URIs**
   
   Add these redirect URIs in your Spotify app settings:
   
   For development:
   ```
   http://localhost:5173/spotify/callback
   ```
   
   For production:
   ```
   https://your-domain.com/spotify/callback
   ```
   
   Also add the Edge Function callback URL:
   ```
   https://your-project-ref.supabase.co/functions/v1/spotify-oauth-callback
   ```

2. **Required Scopes**
   
   The OAuth flow requests these scopes:
   - `streaming` - Required for Web Playback SDK
   - `user-read-email` - Read user email
   - `user-read-private` - Read user profile
   - `user-modify-playback-state` - Control playback
   - `user-read-playback-state` - Read playback state

## Architecture

### Backend (Supabase Edge Functions)

1. **spotify-oauth-login** (`/functions/v1/spotify-oauth-login`)
   - Redirects user to Spotify authorization page
   - Handles OAuth initiation

2. **spotify-oauth-callback** (`/functions/v1/spotify-oauth-callback`)
   - Receives authorization code from Spotify
   - Exchanges code for access/refresh tokens
   - Redirects to frontend with tokens

3. **spotify-oauth-refresh** (`/functions/v1/spotify-oauth-refresh`)
   - Refreshes expired access tokens
   - Called automatically when token expires

### Frontend

1. **SpotifyLoginButton Component**
   - UI button to initiate OAuth flow
   - Shows connection status

2. **SpotifyCallback Page** (`/spotify/callback`)
   - Receives tokens from OAuth callback
   - Stores tokens in localStorage
   - Redirects user to Vibe Rooms

3. **spotifyAuth.ts**
   - Token management utilities
   - Auto-refresh logic
   - Connection status checking

4. **spotifyVibeRoom.ts**
   - Spotify Web Playback SDK integration
   - Host/listener sync logic
   - Track state management

## Usage

### For Users

1. Navigate to `/music/vibe-rooms`
2. Click "Connect Spotify" button
3. Authorize Fluxa in Spotify
4. You'll be redirected back and can now create/join rooms

### For Developers

```typescript
import { SpotifyLoginButton } from "@/components/SpotifyLoginButton";
import { isSpotifyConnected, getSpotifyAccessToken } from "@/lib/spotifyAuth";

// Check if connected
if (isSpotifyConnected()) {
  // Get token (auto-refreshes if expired)
  const token = await getSpotifyAccessToken();
}

// Use login button
<SpotifyLoginButton />
```

## Token Storage

Tokens are stored in `localStorage`:
- `spotify_access_token` - Current access token
- `spotify_refresh_token` - Refresh token (long-lived)
- `spotify_expires_in` - Token expiration time (seconds)
- `spotify_token_timestamp` - When token was issued

⚠️ **Security Note**: In production, consider storing refresh tokens server-side and encrypting them. For MVP, localStorage is acceptable.

## Token Refresh

Access tokens expire after 1 hour. The system automatically refreshes tokens:
- Token expiration is checked before each API call
- If expired, refresh token is used to get new access token
- New token is stored automatically
- User experience is seamless

## Testing

1. **Development**
   ```bash
   npm run dev
   ```
   - Open `http://localhost:5173/music/vibe-rooms`
   - Click "Connect Spotify"
   - Complete OAuth flow

2. **Check Connection**
   - Button should show "Spotify Connected" after successful auth
   - Check browser console for any errors
   - Verify tokens in localStorage

3. **Test Token Refresh**
   - Wait for token to expire (or manually expire it)
   - Make a Spotify API call
   - Should auto-refresh seamlessly

## Troubleshooting

### "Missing VITE_SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_ID" Error
- Ensure secrets are set in Supabase Dashboard
- Secret names: `VITE_SPOTIFY_CLIENT_ID` (preferred) or `SPOTIFY_CLIENT_ID` (backward compatible), and `SPOTIFY_CLIENT_SECRET`

### "Invalid redirect_uri" Error
- Check redirect URIs in Spotify app settings
- Ensure callback URL matches exactly (including protocol, domain, path)

### "Token refresh failed"
- Check refresh token is stored correctly
- Verify Edge Function secrets are set
- Check network tab for error responses

### "User needs Spotify Premium"
- Web Playback SDK requires Premium
- Show user-friendly message to upgrade

## Next Steps

- [ ] Add token encryption for production
- [ ] Store refresh tokens server-side
- [ ] Add Spotify disconnect functionality
- [ ] Show Premium requirement message
- [ ] Add error handling UI
- [ ] Test with multiple users in same room

## Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- [Spotify OAuth Guide](https://developer.spotify.com/documentation/general/guides/authorization-guide/)
