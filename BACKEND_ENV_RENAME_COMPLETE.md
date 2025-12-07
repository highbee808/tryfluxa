# ✅ Backend Environment Variable Rename - COMPLETE

## Summary

Successfully renamed all backend Edge Function environment variables to remove `VITE_` prefix. Backend now uses non-prefixed env vars (e.g., `SPOTIFY_CLIENT_ID` instead of `VITE_SPOTIFY_CLIENT_ID`), while frontend continues to use `VITE_*` as required by Vite.

---

## ✅ Files Changed

### 1. `supabase/functions/_shared/env.ts` - **MAJOR REFACTOR**
**Changes:**
- ✅ Updated to use NON-prefixed env vars: `SUPABASE_URL`, `SPOTIFY_CLIENT_ID`, etc.
- ✅ Removed fallback to `VITE_*` prefixed vars
- ✅ Added safety check logging for missing critical vars
- ✅ Updated error messages to show correct env var names (no VITE_ prefix)
- ✅ Kept `ENV` object for backward compatibility (but reads from non-prefixed rawEnv)

**Key Changes:**
```typescript
// Before: Checked both VITE_* and non-prefixed
SUPABASE_URL: Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL')

// After: Only checks non-prefixed (backend standard)
SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? ''
```

---

### 2. Spotify & Music Edge Functions (10 files)
All updated to use non-prefixed env vars:

- ✅ `supabase/functions/spotify-token/index.ts`
- ✅ `supabase/functions/spotify-oauth-login/index.ts`
- ✅ `supabase/functions/spotify-oauth-callback/index.ts`
- ✅ `supabase/functions/spotify-oauth-refresh/index.ts`
- ✅ `supabase/functions/spotify-proxy/index.ts`
- ✅ `supabase/functions/artist-profile/index.ts`
- ✅ `supabase/functions/artist-bio-albums/index.ts`
- ✅ `supabase/functions/music-search/index.ts`
- ✅ `supabase/functions/music-latest/index.ts`
- ✅ `supabase/functions/music-trending/index.ts`

**Changes:**
```typescript
// Before
const clientId = Deno.env.get("VITE_SPOTIFY_CLIENT_ID");
const base = Deno.env.get("VITE_SPOTIFY_API_BASE");

// After
const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
const base = Deno.env.get("SPOTIFY_API_BASE");
```

---

### 3. Other Edge Functions Using Supabase (6 files)
Updated to use new `env` object instead of `ENV.VITE_*`:

- ✅ `supabase/functions/vibe-room/index.ts`
- ✅ `supabase/functions/publish-gist-v2/index.ts`
- ✅ `supabase/functions/generate-gist-v2/index.ts`
- ✅ `supabase/functions/fluxa-chat/index.ts`
- ✅ `supabase/functions/auto-generate-gists-v2/index.ts`
- ✅ `supabase/functions/text-to-speech/index.ts`
- ✅ `supabase/functions/realtime-session/index.ts`
- ✅ `supabase/functions/_shared/cache.ts`

**Changes:**
```typescript
// Before
import { ENV } from '../_shared/env.ts'
const supabase = createClient(ENV.VITE_SUPABASE_URL, ENV.VITE_SUPABASE_ANON_KEY)

// After
import { env, ensureSupabaseEnv } from '../_shared/env.ts'
ensureSupabaseEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
```

---

### 4. Frontend Files (Still Use VITE_* - Correct)
- ✅ `src/lib/supabaseClient.ts` - Added error logging
- ✅ `src/integrations/supabase/client.ts` - Added error logging

**Note:** Frontend files correctly continue using `VITE_*` prefixed vars (required by Vite).

---

## 🔧 Updated Environment Variable Names

### Backend (Supabase Edge Functions) - **NO VITE_ PREFIX**
Set these in **Supabase Dashboard → Settings → Edge Functions → Secrets**:

```
SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
SPOTIFY_CLIENT_SECRET=c1ade36db76249139046783aced3d5e0
SPOTIFY_API_BASE=https://api.spotify.com/v1
SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
FRONTEND_URL=https://tryfluxa.vercel.app
OPENAI_API_KEY=<your_openai_key>
CRON_SECRET=<your_cron_secret>
LASTFM_API_KEY=<your_lastfm_key>
```

### Frontend (Vercel) - **KEEP VITE_ PREFIX**
Set these in **Vercel Dashboard → Settings → Environment Variables**:

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

---

## ❌ Variables to DELETE from Supabase Secrets

If you see any of these in Supabase Edge Function secrets, **delete them** (they're old names):

- ❌ `VITE_SUPABASE_URL` (use `SUPABASE_URL`)
- ❌ `VITE_SUPABASE_ANON_KEY` (use `SUPABASE_ANON_KEY`)
- ❌ `VITE_SPOTIFY_CLIENT_ID` (use `SPOTIFY_CLIENT_ID`)
- ❌ `VITE_SPOTIFY_CLIENT_SECRET` (use `SPOTIFY_CLIENT_SECRET`)
- ❌ `VITE_SPOTIFY_API_BASE` (use `SPOTIFY_API_BASE`)
- ❌ `VITE_SPOTIFY_REDIRECT_URI` (use `SPOTIFY_REDIRECT_URI`)
- ❌ `VITE_FRONTEND_URL` (use `FRONTEND_URL`)

---

## 🚀 Deployment Instructions

### 1. Update Supabase Edge Function Secrets

```bash
# Remove old VITE_* prefixed secrets (if they exist)
supabase secrets unset VITE_SUPABASE_URL
supabase secrets unset VITE_SUPABASE_ANON_KEY
supabase secrets unset VITE_SPOTIFY_CLIENT_ID
supabase secrets unset VITE_SPOTIFY_CLIENT_SECRET
supabase secrets unset VITE_SPOTIFY_API_BASE
supabase secrets unset VITE_SPOTIFY_REDIRECT_URI
supabase secrets unset VITE_FRONTEND_URL

# Set new NON-prefixed secrets
supabase secrets set SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
supabase secrets set SUPABASE_ANON_KEY=<your_anon_key>
supabase secrets set SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
supabase secrets set SPOTIFY_CLIENT_SECRET=c1ade36db76249139046783aced3d5e0
supabase secrets set SPOTIFY_API_BASE=https://api.spotify.com/v1
supabase secrets set SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
supabase secrets set FRONTEND_URL=https://tryfluxa.vercel.app
```

### 2. Deploy Updated Edge Functions

```bash
# Deploy all updated functions
supabase functions deploy artist-profile
supabase functions deploy spotify-token
supabase functions deploy spotify-oauth-login
supabase functions deploy spotify-oauth-callback
supabase functions deploy spotify-proxy
supabase functions deploy spotify-oauth-refresh
supabase functions deploy music-search
supabase functions deploy music-latest
supabase functions deploy music-trending
supabase functions deploy artist-bio-albums
supabase functions deploy log-artist-search
supabase functions deploy music-trending-searches
supabase functions deploy vibe-room
supabase functions deploy publish-gist-v2
supabase functions deploy generate-gist-v2
supabase functions deploy fluxa-chat
supabase functions deploy auto-generate-gists-v2
supabase functions deploy text-to-speech
supabase functions deploy realtime-session
```

### 3. Keep Vercel Variables as VITE_* (Frontend)

**Do NOT change Vercel environment variables** - they should remain `VITE_*` prefixed for the frontend build.

---

## ✅ Expected Results

- ✅ Artist profile works without 401 errors
- ✅ All Spotify functions use non-prefixed env vars
- ✅ All Supabase functions use non-prefixed env vars
- ✅ Frontend continues to use `VITE_*` (correct)
- ✅ Backend and frontend env vars are clearly separated
- ✅ No confusion between backend and frontend env var names

---

## 📝 Key Changes Summary

**Backend (Edge Functions):**
- ❌ Before: `VITE_SPOTIFY_CLIENT_ID`, `VITE_SUPABASE_URL`
- ✅ After: `SPOTIFY_CLIENT_ID`, `SUPABASE_URL`

**Frontend (Browser):**
- ✅ Still uses: `VITE_SUPABASE_URL`, `VITE_SPOTIFY_CLIENT_ID` (correct - required by Vite)

**Result:**
- Clear separation: Backend uses non-prefixed, Frontend uses `VITE_*` prefixed
- No more confusion between backend and frontend env var names

---

**Status:** ✅ **COMPLETE - Ready for deployment**
