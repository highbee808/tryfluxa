# Quick Deployment Guide - Spotify Functions

## Fixes Applied ✅

1. **Fixed PowerShell syntax error** in `deploy-functions.ps1`
2. **Removed invalid `--all` flag** from documentation
3. **Updated function list** to only include functions that actually exist

## Quick Deploy

### Option 1: Deploy Spotify Functions Only (Recommended)

```powershell
.\scripts\deploy-spotify-functions.ps1
```

This deploys:
- spotify-oauth-login
- spotify-oauth-refresh
- spotify-oauth-callback
- search-artists
- music-search
- music-latest
- music-trending
- music-trending-searches

### Option 2: Deploy All Functions

```powershell
.\scripts\deploy-functions.ps1
```

This deploys all 67 Edge Functions.

### Option 3: Deploy Individual Functions

```bash
npx supabase functions deploy spotify-oauth-login --project-ref vzjyclgrqoyxbbzplkgw
npx supabase functions deploy spotify-oauth-refresh --project-ref vzjyclgrqoyxbbzplkgw
npx supabase functions deploy spotify-oauth-callback --project-ref vzjyclgrqoyxbbzplkgw
npx supabase functions deploy search-artists --project-ref vzjyclgrqoyxbbzplkgw
```

## Important Notes

1. **No `--all` flag**: Supabase CLI doesn't support deploying all functions at once. Use the PowerShell script instead.

2. **Verify functions exist**: The script only includes functions that actually exist in `supabase/functions/`

3. **Project reference**: All deployments use `--project-ref vzjyclgrqoyxbbzplkgw`

## Troubleshooting

**Error: "Missing closing '}'"**
- ✅ Fixed! The script has been corrected and only includes existing functions

**Error: "unknown flag: --all"**
- ✅ Fixed! Documentation updated - use the PowerShell script instead

**Functions not deploying?**
- Check you're logged in: `supabase login`
- Verify project access: `supabase projects list`
- Link project first: `supabase link --project-ref vzjyclgrqoyxbbzplkgw`

## Next Steps

After deployment:
1. Wait 10-30 seconds for functions to update
2. Test functions at:
   - https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-login
   - https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/search-artists
3. Verify environment variables are set in Supabase Dashboard
