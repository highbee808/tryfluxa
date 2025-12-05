# Cron Job Setup Guide for auto-generate-gists-v2

## ✅ Function Status
The function is **working correctly**! Manual test generated 2 gists successfully.

## 🔧 Cron Job Configuration

### Step 1: Verify Edge Function Environment Variables

In **Supabase Dashboard → Project Settings → Edge Functions → Environment Variables**, ensure you have:

```
CRON_SECRET=68DE6BA1ED9113AA26C725EA4C926
VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
OPENAI_API_KEY=<your-openai-key>
```

### Step 2: Configure Cron Job in Supabase Dashboard

1. Go to **Supabase Dashboard → Database → Cron Jobs** (or **Edge Functions → Cron Jobs**)
2. Click **"New Cron Job"** or edit the existing one
3. Configure as follows:

   **Name:** `auto-generate-gists-v2`
   
   **Function:** `auto-generate-gists-v2`
   
   **Schedule:** `*/30 * * * *` (every 30 minutes)
   
   **Headers:** (Supabase automatically adds `x-cron-signature`, but you can also add):
   ```
   x-cron-secret: 68DE6BA1ED9113AA26C725EA4C926
   ```
   
   **Enabled:** ✅ Make sure this is checked!

### Step 3: Verify Cron Job is Running

1. Check **Supabase Dashboard → Edge Functions → Logs** for `auto-generate-gists-v2`
2. Look for log entries like:
   ```
   🤖 Auto-gist generation v2 triggered with valid HMAC signature
   🤖 Auto-gist generation v2 started at [timestamp]
   ```

### Step 4: Manual Test (Alternative to Cron)

If cron isn't working, you can manually trigger it using:

```bash
curl -X POST https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/auto-generate-gists-v2 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6anljbGdycW95eGJienBsa2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDc2MDUsImV4cCI6MjA3OTMyMzYwNX0.JERDh7qFHHbCaApKaVHbVry0X6qvIK-hNEEQkpWjJOA" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: 68DE6BA1ED9113AA26C725EA4C926"
```

## 🐛 Troubleshooting

### Issue: Cron job not triggering
- **Check:** Is the cron job enabled in the dashboard?
- **Check:** Is `CRON_SECRET` set in Edge Function environment variables?
- **Check:** Are there any errors in the Edge Function logs?

### Issue: Function returns 401
- **Check:** Is `CRON_SECRET` environment variable set correctly?
- **Check:** Is the cron job sending the `x-cron-signature` header? (Supabase should do this automatically)

### Issue: Function returns 500
- **Check:** Are all required environment variables set?
- **Check:** Edge Function logs for specific error messages

## 📊 Expected Behavior

When working correctly, the cron job should:
1. Run every 30 minutes (or your configured schedule)
2. Generate 2-5 new gists per run
3. Log success messages in Edge Function logs
4. Add new content to your feed automatically

## ✅ Verification

After setup, wait 30 minutes and check:
1. **Feed page** - Should show new content
2. **Edge Function logs** - Should show successful runs
3. **Database** - `gists` table should have new entries with recent `created_at` timestamps

