# Environment Variables Synchronization Guide

This guide explains how environment variables are synchronized across local development, `.env` files, and Vercel deployments.

## Overview

The Fluxa project now includes automated environment variable verification and synchronization to ensure:

- ✅ All required Supabase keys are present before starting dev/build
- ✅ Consistent configuration across local and production environments
- ✅ Early failure if required keys are missing
- ✅ Single source of truth for all environment variables

## Required Environment Variables

### Local Development (`.env.local`)

Create or update `.env.local` in the project root with:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id

# Spotify OAuth (Required)
VITE_SPOTIFY_CLIENT_ID=your-spotify-client-id

# Frontend Configuration (Recommended)
FRONTEND_URL=https://tryfluxa.vercel.app
SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
VITE_SPOTIFY_API_BASE=https://api.spotify.com/v1

# Optional but Recommended
CRON_SECRET=your-cron-secret
```

### Vercel Environment Variables

The same variables should be set in Vercel for Production, Preview, and Development environments.

## Automated Verification

### Before Development

Running `npm run dev` automatically verifies environment variables:

```bash
npm run dev
# Runs: npm run verify-env (predev hook)
# Then starts: vite
```

If any required variables are missing, the build will fail with clear error messages:

```
❌ Missing environment variable: VITE_SUPABASE_ANON_KEY
```

### Before Production Build

Running `npm run build` also verifies environment variables:

```bash
npm run build
# Runs: npm run verify-env (prebuild hook)
# Then builds: vite build
```

## Manual Verification

You can manually verify your environment variables at any time:

```bash
npm run verify-env
```

This script:
- ✅ Checks `.env.local`, `.env`, and `process.env`
- ✅ Validates URL formats and key formats
- ✅ Suggests missing optional variables
- ✅ Extracts project ID from Supabase URL automatically

## Synchronizing to Vercel

### Option 1: Automated Script (Recommended)

Run the sync script to generate Vercel CLI commands:

```bash
npm run sync-vercel
```

This script:
- Reads your `.env.local` file
- Generates Vercel CLI commands for each variable
- Provides dashboard instructions as an alternative

### Option 2: Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `tryfluxa`
3. Navigate to **Settings → Environment Variables**
4. Add each variable for **Production**, **Preview**, and **Development**

### Required Vercel Variables

**Regular Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SPOTIFY_CLIENT_ID`
- `FRONTEND_URL`
- `SPOTIFY_REDIRECT_URI`
- `VITE_SPOTIFY_API_BASE`
- `CRON_SECRET`

**Secret Variables** (marked as secrets in Vercel):
- `SPOTIFY_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

## Supabase Edge Functions

Edge Functions also need environment variables set in Supabase:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions → Secrets**
4. Add the following secrets:

```
VITE_SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
FRONTEND_URL=https://tryfluxa.vercel.app
SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
VITE_SUPABASE_URL=https://your-project.supabase.co
```

## Environment Variable Priority

When running locally, variables are loaded in this priority order:

1. `.env.local` (highest priority)
2. `.env`
3. `process.env` (system environment)

This means `.env.local` overrides everything else, which is perfect for local development.

## Troubleshooting

### "Missing environment variable" error

1. Check that `.env.local` exists in the project root
2. Verify the variable name is spelled correctly
3. Ensure there are no quotes around the value (unless needed)
4. Run `npm run verify-env` to see detailed validation

### Spotify OAuth failing

1. Verify `VITE_SPOTIFY_CLIENT_ID` is set in both:
   - Local: `.env.local`
   - Vercel: Environment Variables (all environments)
   - Supabase: Edge Function Secrets (can use `VITE_SPOTIFY_CLIENT_ID` or `SPOTIFY_CLIENT_ID` for backward compatibility)
2. Check `FRONTEND_URL` matches your actual deployment URL
3. Verify `SPOTIFY_REDIRECT_URI` is correctly set in Spotify Developer Dashboard

### Build fails in Vercel

1. Check Vercel Environment Variables are set for the correct environment
2. Verify variable names match exactly (case-sensitive)
3. Check Vercel build logs for specific missing variable names
4. Re-run `npm run sync-vercel` to verify all variables

## Quick Start Checklist

- [ ] Create `.env.local` with required variables
- [ ] Run `npm run verify-env` to validate
- [ ] Set variables in Vercel Dashboard
- [ ] Set secrets in Supabase Dashboard (Edge Functions)
- [ ] Test locally with `npm run dev`
- [ ] Deploy to Vercel and verify build succeeds

## Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

---

**Note:** Never commit `.env.local` to git. It's already in `.gitignore` for your protection.
