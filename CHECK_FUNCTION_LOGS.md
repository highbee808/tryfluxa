# Check Function Logs - Find the 500 Error

The 500 error means the function is crashing. Let's find out why:

## Step 1: Check Function Logs

**In Supabase Dashboard:**
1. **Edge Functions** → `publish-gist`
2. **Click "Logs" tab**
3. **Run the test again** from Admin panel
4. **Check the logs** - you should see error messages

**Look for:**
- ❌ "Missing required environment variables"
- ❌ "Content generation failed"
- ❌ "Function not found"
- ❌ Any stack trace or error message

## Step 2: Common 500 Errors

### Error: "generate-gist function not found"
**Fix:** Deploy `generate-gist` function

### Error: "text-to-speech function not found"  
**Fix:** Deploy `text-to-speech` function

### Error: "Missing OPENAI_API_KEY"
**Fix:** Set `OPENAI_API_KEY` secret

### Error: "Database error"
**Fix:** Check database connection and RLS policies

## Step 3: Share the Logs

Copy the error message from the logs and share it - I can fix it specifically!

---

## Quick Fix: Make Function More Resilient

I'll update the function to handle errors better and show what's actually failing.

