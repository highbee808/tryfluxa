# Deploy Spotify OAuth Login Function

## Configuration Applied

### 1. Function-Level Config
**File:** `supabase/functions/spotify-oauth-login/deno.json`
```json
{
  "deploy": {
    "verify_jwt": false
  }
}
```
This uses Supabase v2 format with the `deploy` block.

### 2. Global Config
**File:** `supabase/config.toml`
```toml
[functions.spotify-oauth-login]
verify_jwt = false
```

### 3. Function Code
**File:** `supabase/functions/spotify-oauth-login/index.ts`
- Uses `sift` server
- Returns 307 redirect to Spotify
- No authorization checks
- Full CORS headers included

## Deployment

Deploy the function with the required flag:

```bash
supabase functions deploy spotify-oauth-login --no-verify-jwt
```

Or use debug mode:

```bash
supabase functions deploy spotify-oauth-login --debug
```

**Note:** The `--no-verify-jwt` flag ensures JWT verification is disabled even if config files aren't recognized.

## Expected Result

After deployment:

✅ `https://<project>.supabase.co/functions/v1/spotify-oauth-login` returns **307 redirect** (not 401)  
✅ Browser can navigate directly without Authorization header  
✅ Redirects to Spotify authorization page  
✅ No CORS errors  

## Testing

1. **Direct URL test:**
   Open in browser: `https://<project>.supabase.co/functions/v1/spotify-oauth-login`
   - Should redirect to Spotify (not show 401)

2. **From Fluxa app:**
   - Navigate to `/music/vibe-rooms`
   - Click "Connect Spotify"
   - Should open Spotify login page
