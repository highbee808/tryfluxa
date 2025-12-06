# Global Environment Variable Patch - Deployment Script

## Quick Deployment Commands

Run these commands to set Supabase Edge Function secrets:

```bash
# Set Supabase configuration
supabase secrets set VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
supabase secrets set VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6anljbGdycW95eGJienBsa2d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc0NzYwNSwiZXhwIjoyMDc5MzIzNjA1fQ.KoTM6PCXJy81_RdN9wa_Q59DFIWDI3dAgLkcMhJazYA

# Set Spotify configuration
supabase secrets set VITE_SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
supabase secrets set VITE_SPOTIFY_CLIENT_SECRET=c1ade36db76249139046783aced3d5e0
supabase secrets set VITE_SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
supabase secrets set VITE_SPOTIFY_API_BASE=https://api.spotify.com/v1
supabase secrets set VITE_FRONTEND_URL=https://tryfluxa.vercel.app
```

## Deploy Updated Edge Functions

```bash
# Deploy critical functions
supabase functions deploy spotify-token
supabase functions deploy spotify-oauth-login
supabase functions deploy spotify-oauth-callback
supabase functions deploy spotify-proxy
supabase functions deploy artist-profile
```

## Vercel Environment Variables

Go to **Vercel Dashboard → Settings → Environment Variables** and set:

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

## Delete These Old Variables (if they exist):

- ❌ `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI`
- ❌ `SPOTIFY_REDIRECT_URI`
- ❌ `SPOTIFY_AUTH_URL`
- ❌ `SPOTIFY_CLIENT_ID`
- ❌ `SPOTIFY_CLIENT_SECRET`
- ❌ `SPOTIFY_API_BASE`
- ❌ `VITE_SPOTIFY_API_PROVIDER`
- ❌ `SUPABASE_URL`
- ❌ `SUPABASE_ANON_KEY`

## Force Vercel Clean Build

After committing changes:

1. Go to **Vercel Dashboard → Deployments**
2. Find the latest deployment
3. Click **"Redeploy"**
4. Check **"Redeploy with Build Cache Disabled"**
5. Click **"Redeploy"**

This ensures the new environment variables are properly injected into the build.
