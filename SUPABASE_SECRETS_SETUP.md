# Supabase Edge Functions Secrets Setup

## ✅ All Functions Updated & Deployed

All four functions have been updated to use the correct environment variable names:

1. ✅ **publish-gist** - Uses `SB_SERVICE_ROLE_KEY`
2. ✅ **generate-gist** - No service role needed (called internally)
3. ✅ **generate-sports-gist** - Uses `SB_SERVICE_ROLE_KEY`
4. ✅ **auto-generate-gists** - Uses `SB_SERVICE_ROLE_KEY`

## 🔑 Required Secrets in Supabase Dashboard

**IMPORTANT:** Supabase Edge Functions use secrets set in the Supabase Dashboard, NOT `.env` files.

### Steps to Set Secrets:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `vzjyclgrqoyxbbzplkgw`
3. Navigate to: **Settings → Edge Functions → Secrets**
4. Add the following secrets:

### Required Secrets:

| Secret Name | Description | Where to Find |
|------------|-------------|---------------|
| `SUPABASE_URL` | Your Supabase project URL | Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key | Settings → API → `anon` `public` key |
| `SB_SERVICE_ROLE_KEY` | Your Supabase service role key | Settings → API → `service_role` `secret` key |
| `OPENAI_API_KEY` | Your OpenAI API key | [OpenAI Dashboard](https://platform.openai.com/api-keys) |
| `CRON_SECRET` | Secret for cron job authentication | Generate a random string (e.g., `openssl rand -hex 32`) |

### Optional Secrets (for better API coverage):

| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `NEWSAPI_KEY` | NewsAPI key for news articles | [newsapi.org](https://newsapi.org/) |
| `GUARDIAN_API_KEY` | Guardian API key | [open-platform.theguardian.com](https://open-platform.theguardian.com/) |
| `MEDIASTACK_KEY` | Mediastack API key | [mediastack.com](https://mediastack.com/) |
| `STATPAL_KEY` | StatPal API key (if used) | Your StatPal account |

## ⚠️ Critical Notes:

1. **Secret Name Format**: Supabase doesn't allow `SUPABASE_` prefix in secret names, so use `SB_SERVICE_ROLE_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`

2. **Service Role Key**: This is **REQUIRED** for admin functions. Without it, you'll get "Missing service role key" error.

3. **Finding Your Keys**:
   - Go to Settings → API
   - Copy the values from the API keys section
   - **Never commit these keys to git!**

## 🧪 Testing After Setup

After setting all secrets:

1. Go to `/admin` page
2. Click "Test Pipeline"
3. You should see:
   - ✅ Starting full pipeline test...
   - ✅ Calling publish-gist function...
   - ✅ Pipeline completed in Xs
   - ✅ generate-gist successful
   - ✅ gist saved to database
   - ✅ Gist confirmed in database

## 🔍 Troubleshooting

### Error: "Missing service role key"

**Solution**: Make sure `SB_SERVICE_ROLE_KEY` is set in Supabase Dashboard → Settings → Edge Functions → Secrets

### Error: "Missing environment variables"

**Solution**: Check that all required secrets are set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SB_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

### Error: "FunctionsHttpError"

**Solution**: 
1. Verify secrets are set correctly
2. Check function logs in Supabase Dashboard → Edge Functions → Logs
3. Ensure frontend is using `invokeAdminFunction()` with correct headers

## 📝 Example Secret Values Format

When adding secrets in Supabase Dashboard, use these exact names:

```
SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SB_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-...
CRON_SECRET=your-random-secret-string-here
```

**Note**: Replace with your actual values from Supabase Dashboard.

