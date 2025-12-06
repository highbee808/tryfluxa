# Fluxa Environment Variables Template

Copy these to `.env.local` for local development, or set in Vercel Dashboard for production.

## Frontend Variables (VITE_ prefix required)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Frontend URL (optional - auto-detected in dev)
VITE_FRONTEND_URL=https://tryfluxa.vercel.app

# Spotify OAuth Configuration
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
VITE_SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
```

## Backend Variables (Supabase Edge Function Secrets)

Set these in: **Supabase Dashboard → Settings → Edge Functions → Secrets**

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-callback
SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_api_key_here
CRON_SECRET=your_cron_secret_here
LASTFM_API_KEY=your_lastfm_api_key_here
```

**Note:** Never commit `.env.local` to git (it's in `.gitignore`)
