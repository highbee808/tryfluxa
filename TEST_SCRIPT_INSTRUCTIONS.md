# Test Script Instructions

## Overview

There are two test scripts available:
1. **test-connection.ps1** - PowerShell version (recommended for Windows)
2. **test-connection.js** - Node.js version (cross-platform)

## PowerShell Version (Windows)

### Quick Start

1. **Set environment variable:**
   ```powershell
   $env:VITE_SUPABASE_URL="https://your-project.supabase.co"
   ```

2. **Run the script:**
   ```powershell
   .\test-connection.ps1
   ```

### Full Example

```powershell
# Set your Supabase URL
$env:VITE_SUPABASE_URL="https://vzjyclgrqoyxbbzplkgw.supabase.co"

# Run the test
.\test-connection.ps1
```

The script will:
- Test all critical Edge Functions
- Verify OPTIONS preflight requests (CORS)
- Check CORS headers are present
- Provide detailed results

### If You Get Execution Policy Error

If you see an error like "cannot be loaded because running scripts is disabled", run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try running the script again.

## Node.js Version (Cross-Platform)

### Prerequisites

Install node-fetch if not already installed:
```bash
npm install node-fetch
```

### Quick Start

**Windows PowerShell:**
```powershell
$env:VITE_SUPABASE_URL="https://your-project.supabase.co"
node test-connection.js
```

**Linux/Mac (Bash):**
```bash
export VITE_SUPABASE_URL=https://your-project.supabase.co
node test-connection.js
```

### Using .env File (Alternative)

Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
```

Then run with dotenv:
```bash
npm install -g dotenv-cli
dotenv node test-connection.js
```

## What the Test Checks

1. ✅ **OPTIONS Preflight** - Verifies CORS preflight requests return 200/204
2. ✅ **CORS Headers** - Checks for:
   - `Access-Control-Allow-Origin`
   - `Access-Control-Allow-Methods`
   - `Access-Control-Allow-Headers`
3. ✅ **Function Accessibility** - Tests if functions are callable
4. ✅ **Error Handling** - Reports detailed error information

## Expected Output

```
🚀 Starting Edge Function Connectivity Tests

📍 Base URL: https://your-project.supabase.co
📍 Functions URL: https://your-project.supabase.co/functions/v1

🔍 Testing fetch-content...
  ✅ OPTIONS preflight: 200
  ✅ CORS Origin: *
  ✅ CORS Methods: GET, POST, OPTIONS
  ✅ CORS Headers: Content-Type, Authorization, apikey

[... more tests ...]

============================================================
📊 SUMMARY
============================================================

✅ Successful OPTIONS: 7/7
✅ With CORS headers: 7/7
❌ Errors: 0/7

✅ Test complete!
```

## Troubleshooting

### Missing Environment Variable

**PowerShell:**
```powershell
# Check if variable is set
$env:VITE_SUPABASE_URL

# Set it if missing
$env:VITE_SUPABASE_URL="https://your-project.supabase.co"
```

**Bash:**
```bash
# Check if variable is set
echo $VITE_SUPABASE_URL

# Set it if missing
export VITE_SUPABASE_URL=https://your-project.supabase.co
```

### Functions Returning 404

If functions return 404, they may not be deployed. Check:
1. Supabase Dashboard → Edge Functions
2. Verify functions are deployed
3. Check function names match exactly

### CORS Errors

If CORS headers are missing:
1. Verify function uses shared CORS helper: `import { corsHeaders } from "../_shared/http.ts"`
2. Check function handles OPTIONS requests
3. Verify CORS headers are included in all responses

### Network Errors

If you see network errors:
1. Verify Supabase URL is correct
2. Check internet connection
3. Verify firewall isn't blocking requests
4. Try accessing function URL directly in browser

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Test Edge Functions
  run: |
    export VITE_SUPABASE_URL=${{ secrets.SUPABASE_URL }}
    node test-connection.js
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
```

### Azure DevOps

```yaml
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
- script: |
    export VITE_SUPABASE_URL=$(SUPABASE_URL)
    node test-connection.js
  env:
    SUPABASE_URL: $(SUPABASE_URL)
```

## Next Steps

After running the test script:
1. Fix any functions that fail OPTIONS preflight
2. Update functions missing CORS headers
3. Deploy updated functions to Supabase
4. Re-run tests to verify fixes
