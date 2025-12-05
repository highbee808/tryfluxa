# PowerShell version of test-connection script
# Run with: .\test-connection.ps1

# Get base URL from environment or prompt
$base = $env:VITE_SUPABASE_URL
if (-not $base) {
    $base = Read-Host "Enter your Supabase URL (e.g., https://your-project.supabase.co)"
}

if (-not $base) {
    Write-Host "❌ Missing VITE_SUPABASE_URL environment variable" -ForegroundColor Red
    Write-Host "   Set it with: `$env:VITE_SUPABASE_URL='https://your-project.supabase.co'" -ForegroundColor Yellow
    exit 1
}

# Remove trailing slash if present
$cleanBase = $base.TrimEnd('/')
$functionsBase = "$cleanBase/functions/v1"

Write-Host "🚀 Starting Edge Function Connectivity Tests`n" -ForegroundColor Green
Write-Host "📍 Base URL: $cleanBase" -ForegroundColor Cyan
Write-Host "📍 Functions URL: $functionsBase`n" -ForegroundColor Cyan

# List of critical functions to test
$endpoints = @(
    "fetch-content",
    "publish-gist",
    "spotify-oauth-login",
    "generate-gist",
    "text-to-speech",
    "fluxa-chat",
    "fetch-feed"
)

$results = @()

foreach ($endpoint in $endpoints) {
    $url = "$functionsBase/$endpoint"
    
    Write-Host "`n🔍 Testing $endpoint..." -ForegroundColor Yellow
    
    try {
        # Test OPTIONS request
        $optionsResponse = Invoke-WebRequest -Uri $url -Method Options -ErrorAction SilentlyContinue
        
        if ($optionsResponse.StatusCode -eq 200 -or $optionsResponse.StatusCode -eq 204) {
            Write-Host "  ✅ OPTIONS preflight: $($optionsResponse.StatusCode)" -ForegroundColor Green
            
            # Check CORS headers
            $corsOrigin = $optionsResponse.Headers['Access-Control-Allow-Origin']
            $corsMethods = $optionsResponse.Headers['Access-Control-Allow-Methods']
            $corsHeaders = $optionsResponse.Headers['Access-Control-Allow-Headers']
            
            if ($corsOrigin) {
                Write-Host "  ✅ CORS Origin: $corsOrigin" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  CORS Origin header missing" -ForegroundColor Yellow
            }
            
            if ($corsMethods) {
                Write-Host "  ✅ CORS Methods: $corsMethods" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  CORS Methods header missing" -ForegroundColor Yellow
            }
            
            if ($corsHeaders) {
                Write-Host "  ✅ CORS Headers: $corsHeaders" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  CORS Headers header missing" -ForegroundColor Yellow
            }
            
            $results += @{
                Endpoint = $endpoint
                Url = $url
                OptionsStatus = $optionsResponse.StatusCode
                HasCors = [bool]$corsOrigin
                Error = $null
            }
        } else {
            Write-Host "  ❌ OPTIONS preflight failed: $($optionsResponse.StatusCode)" -ForegroundColor Red
            $results += @{
                Endpoint = $endpoint
                Url = $url
                OptionsStatus = $optionsResponse.StatusCode
                HasCors = $false
                Error = "OPTIONS failed"
            }
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host "  ⚠️  Function may not exist (404)" -ForegroundColor Yellow
        } elseif ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Host "  ✅ Function exists ($statusCode - auth required, expected)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Error testing $endpoint : $_" -ForegroundColor Red
        }
        
        $results += @{
            Endpoint = $endpoint
            Url = $url
            OptionsStatus = $statusCode
            HasCors = $false
            Error = $_.Exception.Message
        }
    }
}

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

$successful = $results | Where-Object { $_.OptionsStatus -eq 200 -or $_.OptionsStatus -eq 204 }
$withCors = $results | Where-Object { $_.HasCors -eq $true }
$errors = $results | Where-Object { $_.Error }

Write-Host "`n✅ Successful OPTIONS: $($successful.Count)/$($endpoints.Count)" -ForegroundColor Green
Write-Host "✅ With CORS headers: $($withCors.Count)/$($endpoints.Count)" -ForegroundColor Green
Write-Host "❌ Errors: $($errors.Count)/$($endpoints.Count)" -ForegroundColor $(if ($errors.Count -gt 0) { "Red" } else { "Green" })

if ($errors.Count -gt 0) {
    Write-Host "`n❌ Failed endpoints:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   - $($error.Endpoint): $($error.Error)" -ForegroundColor Red
    }
}

Write-Host "`n✅ Test complete!" -ForegroundColor Green

if ($errors.Count -gt 0 -or $successful.Count -lt $endpoints.Count) {
    exit 1
}
