# Backend/API Connectivity Audit & Repair

## 🔍 Issues Found & Fixes Applied

### ✅ 1. Shared API Configuration Created

**File:** `src/lib/apiConfig.ts` (NEW)

Provides:
- `getSupabaseUrl()` - Validates and returns Supabase URL
- `getSupabaseAnonKey()` - Returns anon key with fallbacks
- `getApiBaseUrl()` - Returns `/functions/v1` base URL
- `getFrontendUrl()` - Uses FRONTEND_URL in prod, window.location.origin in dev
- `getDefaultHeaders()` - Standard headers for all API calls

### ✅ 2. Fixed Core API Client Files

**Files Updated:**
- `src/lib/supabaseFunctionClient.ts` - Now uses shared API config, includes debug logging
- `src/lib/invokeAdminFunction.ts` - Uses shared API config, enhanced error logging
- `src/lib/spotifyAuth.ts` - Uses FRONTEND_URL in production

### ⏳ 3. Files Still Needing Updates

The following files need to be updated to use the shared API config:

1. **`src/lib/vibeRooms.ts`** - Multiple fetch calls
2. **`src/lib/musicService.ts`** - Multiple fetch calls  
3. **`src/lib/supabase-functions.ts`** - Uses direct fetch
4. **`src/pages/Admin.tsx`** - Direct endpoint construction
5. **`src/components/SpotifyLoginButton.tsx`** - Already correct (uses window.location.href)

### ⏳ 4. Edge Functions CORS Audit Needed

All Edge Functions should include:
- CORS headers in responses
- OPTIONS request handling
- Using shared `corsHeaders` from `_shared/http.ts`

### ⏳ 5. Environment Variables Checklist

**Frontend (.env.local & Vercel):**
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_SPOTIFY_CLIENT_ID`
- [ ] `VITE_SPOTIFY_API_BASE`
- [ ] `FRONTEND_URL` (or `VITE_FRONTEND_URL`)
- [ ] `SPOTIFY_REDIRECT_URI`
- [ ] `CRON_SECRET` (backend only)

## 🚧 Work In Progress

Continuing to fix remaining files...
