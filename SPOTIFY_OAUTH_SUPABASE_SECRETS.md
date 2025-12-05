# Supabase Edge Functions Secrets Setup

## 📋 Required Supabase Secrets

Go to: **Supabase Dashboard → Edge Functions → Secrets**

### Add or Update These Secrets:

| Secret Name | Value | Notes |
|------------|-------|-------|
| `SPOTIFY_CLIENT_ID` | `5eb9f883bc4c4c7892ba679ebd8fe189` | Spotify Client ID |
| `SPOTIFY_CLIENT_SECRET` | `<keep existing>` | Your Spotify Client Secret (don't change if already set) |
| `FRONTEND_URL` | `https://tryfluxa.vercel.app` | Production frontend URL |
| `SPOTIFY_REDIRECT_URI` | `https://tryfluxa.vercel.app/spotify/callback` | Unified redirect URI |

### ⚠️ Important

1. **Remove** any old redirect URI secrets:
   - ❌ `VITE_SPOTIFY_REDIRECT_URI`
   - ❌ `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI`
   - ❌ Any Supabase function callback URLs

2. **Keep** `SPOTIFY_CLIENT_SECRET` as-is (don't regenerate)

3. **Ensure** redirect URI matches exactly:
   - Must be: `https://tryfluxa.vercel.app/spotify/callback`
   - No trailing slashes
   - Must match Spotify Developer Dashboard

## 🔧 How to Update Secrets

### Via Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/vzjyclgrqoyxbbzplkgw/settings/edge-functions
2. Click "Secrets" tab
3. Add or update each secret
4. Click "Save"

### Via Supabase CLI:

```bash
# Set SPOTIFY_CLIENT_ID
supabase secrets set SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189

# Set FRONTEND_URL
supabase secrets set FRONTEND_URL=https://tryfluxa.vercel.app

# Set SPOTIFY_REDIRECT_URI
supabase secrets set SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback

# Keep existing SPOTIFY_CLIENT_SECRET (don't change)
```

## ✅ Verification

After updating secrets, verify:

1. All secrets are set correctly
2. Redirect URI matches exactly: `https://tryfluxa.vercel.app/spotify/callback`
3. Spotify Developer Dashboard has the same redirect URI registered

## 🎯 Spotify Developer Dashboard

Ensure your Spotify app has this redirect URI registered:

**Settings → Redirect URIs:**
- `https://tryfluxa.vercel.app/spotify/callback`

**Important:** The redirect URI must match **exactly** (case-sensitive, no trailing slashes).
