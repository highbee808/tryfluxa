# Deploy Functions via CLI

Since you're logged in, let's deploy! The CLI might not be in PATH. Here are options:

## Option 1: Restart Terminal

After installing CLI, **restart your terminal** (close and reopen VS Code terminal) so PATH updates.

Then run:
```powershell
supabase link --project-ref vzjyclgrqoyxbbzplkgw
supabase functions deploy publish-gist
supabase functions deploy generate-gist
supabase functions deploy text-to-speech
```

## Option 2: Find CLI Location

If CLI is installed but not in PATH, find it:
```powershell
# Check common locations
Get-ChildItem -Path "$env:USERPROFILE\AppData\Local" -Filter "supabase.exe" -Recurse -ErrorAction SilentlyContinue
Get-ChildItem -Path "$env:USERPROFILE\.local\bin" -Filter "supabase.exe" -ErrorAction SilentlyContinue
```

Then use full path:
```powershell
C:\path\to\supabase.exe link --project-ref vzjyclgrqoyxbbzplkgw
```

## Option 3: Use Dashboard (Easier)

Since CLI setup is tricky, use Dashboard:

1. **Supabase Dashboard** → **Edge Functions**
2. Deploy each function by copying code from:
   - `supabase/functions/publish-gist/index.ts`
   - `supabase/functions/generate-gist/index.ts`
   - `supabase/functions/text-to-speech/index.ts`

---

## Quick Test After Deploying

Once all 3 are deployed, test:
```javascript
// In browser console
const { data, error } = await supabase.functions.invoke('publish-gist', {
  body: { topic: 'Test' }
});
console.log('Result:', error || 'Success!');
```

