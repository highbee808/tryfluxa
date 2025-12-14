# Summary Format Fix - Concise & Friendly

## Problem Fixed

The manually generated posts (via `publish-gist-v3`) were showing verbose summaries with:
- Bullet points with URLs
- "What we know from sources" sections
- Long format that's hard to read

These summaries didn't match the concise, friendly style of auto-generated content.

## Solution

### 1. Updated AI Prompt in `publish-gist-v3`
- Changed from fact-checking assistant format to **Fluxa's friendly, conversational style**
- Summary is now **max 150 chars** (was 200)
- **Full_gist** is now friendly conversational text:
  - NO bullet points
  - NO URLs in text
  - NO section headers like "What we know from sources"
  - Just 2-3 friendly paragraphs like a text message

### 2. Updated Context Field Assignment
- Uses `summary` field (concise, friendly) for the `context` database field
- If summary is missing, it cleans up `full_gist` by removing bullets and URLs before using it
- Ensures the displayed summary is always concise and readable

### 3. Format Comparison

**Before (Bad):**
```
Raphinha has been instrumental in Barcelona's recent performances, contributing to key victories and emotional moments.

What we know from sources:
• Raphinha set up two early goals in a match where Barcelona won 3-1 against Alaves (Source 3: https://www.marca.com/en/football/barcelona/2025/11/29/692)
• [More bullet points with URLs...]
```

**After (Good - like auto-generated):**
```
Raphinha's been absolutely crushing it for Barca lately. He set up two early goals in their 3-1 win against Alaves and has been a key playmaker in recent matches. The fans are loving his impact on the field!
```

## Files Changed

1. **`supabase/functions/publish-gist-v3/index.ts`**
   - Updated system prompt (line ~312)
   - Updated context field assignment (line ~592)

## Testing

To test the fix:

1. Generate a new post via Admin panel
2. Check that the summary is:
   - Concise (max 150 chars)
   - Friendly and conversational
   - No bullet points
   - No URLs in the text
   - Matches the style of auto-generated content

## Trigger Cron Job Immediately

To start generating content right away:

**Option 1: Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select project → Functions → `/api/cron/generate`
3. Click "Invoke" or "Test"

**Option 2: API Call**
```bash
curl -X GET "https://tryfluxa.vercel.app/api/cron/generate?secret=YOUR_CRON_SECRET"
```

**Option 3: Wait for Next Hour**
- Cron runs automatically at the top of every hour (`0 * * * *`)
- Generates 30 new posts each time

See `scripts/trigger-cron-now.md` for more details.
