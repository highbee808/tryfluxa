# Spotify OAuth Environment Setup

## 📋 Required Changes to `.env.local`

Update your `.env.local` file with these exact values:

```env
VITE_SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
FRONTEND_URL=https://tryfluxa.vercel.app
SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback
```

### ⚠️ Important

- **Remove** any old redirect URI values
- **Remove** duplicate redirect URI entries
- **Keep** existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values

### Complete `.env.local` Example

```env
# Supabase
VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Spotify OAuth (UNIFIED)
VITE_SPOTIFY_CLIENT_ID=5eb9f883bc4c4c7892ba679ebd8fe189
FRONTEND_URL=https://tryfluxa.vercel.app
SPOTIFY_REDIRECT_URI=https://tryfluxa.vercel.app/spotify/callback

# Other variables...
```

## 🗑️ Clean Up (Optional)

You can remove these if they exist (not needed):
- ❌ `VITE_LASTFM_SHARED_SECRET` (if not used)
- ❌ `VITE_SPOTIFY_REDIRECT_URI` (use `SPOTIFY_REDIRECT_URI` instead)
- ❌ `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` (not needed)
- ❌ Any old callback URLs

## ✅ Keep These Variables

- ✔ `VITE_SPOTIFY_CLIENT_ID`
- ✔ `FRONTEND_URL`
- ✔ `SPOTIFY_REDIRECT_URI`

## 🔄 After Updating `.env.local`

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Clear browser cache if testing locally

3. Verify the redirect URI matches exactly:
   - Must be: `https://tryfluxa.vercel.app/spotify/callback`
   - No trailing slashes
   - Must match exactly in Spotify Developer Dashboard
