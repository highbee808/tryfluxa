# Quick Fix: Update Supabase URL

## The Problem

Your `.env.local` file has the **OLD** Lovable project URL:
```
VITE_SUPABASE_URL="https://zikzuwomznlpgvrftcpf.supabase.co"  ❌
```

But your **NEW** project ID is: `vzjyclgrqoyxbbzplkgw`

## The Fix

### Option 1: Manual Edit (Recommended)

1. Open `.env.local` in your editor
2. Find this line:
   ```
   VITE_SUPABASE_URL="https://zikzuwomznlpgvrftcpf.supabase.co"
   ```
3. Replace it with:
   ```
   VITE_SUPABASE_URL="https://vzjyclgrqoyxbbzplkgw.supabase.co"
   ```
4. Save the file
5. **RESTART your dev server** (stop with Ctrl+C, then `npm run dev`)

### Option 2: Use PowerShell Script

I've created `update-env.ps1` - just run:
```powershell
.\update-env.ps1
```

Then restart your dev server.

## Verify It's Fixed

After restarting, check the browser console:
- ❌ Should NOT see: `zikzuwomznlpgvrftcpf`
- ✅ Should see: `vzjyclgrqoyxbbzplkgw` (or your actual project URL)

## After Fixing

1. The "Invalid API key" errors should stop
2. The feed should load (may be empty - that's normal)
3. Go to `/admin` to generate test content
4. Then check `/feed` to see the content

