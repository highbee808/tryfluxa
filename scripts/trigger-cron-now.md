# Trigger Content Generation Cron Job Immediately

## Option 1: Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Select your project: `tryfluxa`
3. Go to **Functions** tab
4. Find `/api/cron/generate`
5. Click **Invoke** or **Test** button
6. This will trigger the pipeline immediately

## Option 2: Via API Call (Manual)

```bash
# Get your CRON_SECRET from Vercel environment variables
curl -X GET "https://tryfluxa.vercel.app/api/cron/generate?secret=YOUR_CRON_SECRET"
```

Or via PowerShell:
```powershell
$secret = "YOUR_CRON_SECRET"  # Get from Vercel env vars
Invoke-WebRequest -Uri "https://tryfluxa.vercel.app/api/cron/generate?secret=$secret" -Method GET
```

## Option 3: Via Admin Panel

1. Go to `/admin` in your app
2. Look for a "Generate Content" or "Trigger Cron" button
3. If it exists, click it to trigger manually

## What Happens When Triggered

- Generates 30 new posts
- Each post gets a headline with emojis
- Uses source images first, DALL-E as fallback
- Creates concise, friendly summaries
- Takes ~5-10 minutes to complete (due to API calls)

## Check Results

After triggering, check:
1. **Vercel Logs**: See function execution logs
2. **Database**: Query `SELECT COUNT(*) FROM gists WHERE created_at > NOW() - INTERVAL '15 minutes'`
3. **Feed**: Refresh `/feed` to see new content
