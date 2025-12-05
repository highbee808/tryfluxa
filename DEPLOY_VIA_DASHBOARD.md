# Deploy Functions via Dashboard (Easiest - No Installation)

Since you don't have CLI installed, let's deploy via Dashboard. It's simple!

## Step-by-Step Deployment

### Function 1: Deploy `publish-gist`

1. **Open Supabase Dashboard** → Your Project
2. **Go to Edge Functions** (left sidebar)
3. **Click "Create function"** (or find `publish-gist` if it exists and click to edit)
4. **Function name:** `publish-gist`
5. **Open this file in your editor:** `supabase/functions/publish-gist/index.ts`
6. **Copy ALL the code** (Ctrl+A, Ctrl+C)
7. **Paste into the Dashboard editor**
8. **Click "Deploy"** (or "Save" if editing)

### Function 2: Deploy `generate-gist`

1. **Click "Create function"** again
2. **Function name:** `generate-gist`
3. **Open:** `supabase/functions/generate-gist/index.ts`
4. **Copy ALL the code**
5. **Paste and Deploy**

### Function 3: Deploy `text-to-speech`

1. **Click "Create function"** again
2. **Function name:** `text-to-speech`
3. **Open:** `supabase/functions/text-to-speech/index.ts`
4. **Copy ALL the code**
5. **Paste and Deploy**

---

## Verify Deployment

After deploying all 3:

1. **Edge Functions** → Should see all 3 functions listed
2. Each should show as **"Active"** or **"Deployed"**
3. **Secrets are already set** (you have them configured)

---

## Test

1. **Wait 10-30 seconds** after deploying
2. **Go to Admin panel** in your app
3. **Click "Run Full Pipeline Test"**

---

## Quick Checklist

- [ ] `publish-gist` deployed
- [ ] `generate-gist` deployed
- [ ] `text-to-speech` deployed
- [ ] All show as "Active" in Dashboard
- [ ] Tested in Admin panel

That's it! No CLI installation needed.

