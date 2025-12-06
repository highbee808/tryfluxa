# PowerShell script to deploy all Edge Functions to the correct Supabase project
# Run this script: .\scripts\deploy-functions.ps1

param(
    [string]$ProjectRef = "vzjyclgrqoyxbbzplkgw"
)

Write-Host "🚀 Fluxa Edge Functions Deployment Script" -ForegroundColor Cyan
Write-Host "Project: $ProjectRef" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Supabase CLI:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://github.com/supabase/cli/releases" -ForegroundColor Yellow
    Write-Host "2. Or install via Scoop: scoop install supabase" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
Write-Host "Checking Supabase login..." -ForegroundColor Yellow
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Supabase CLI" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please log in first:" -ForegroundColor Yellow
    Write-Host "  supabase login" -ForegroundColor White
    exit 1
}

Write-Host "✅ Logged in to Supabase" -ForegroundColor Green

# Link project
Write-Host ""
Write-Host "Linking project: $ProjectRef" -ForegroundColor Yellow
supabase link --project-ref $ProjectRef

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to link project" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "1. You have access to project $ProjectRef" -ForegroundColor White
    Write-Host "2. You're logged in: supabase login" -ForegroundColor White
    exit 1
}

Write-Host "✅ Project linked successfully" -ForegroundColor Green

# Deploy all functions
Write-Host ""
Write-Host "Deploying all Edge Functions..." -ForegroundColor Yellow
Write-Host ""

# List of all functions that exist in supabase/functions/
$functions = @(
    "admin-refresh-trends",
    "ai-news-summary",
    "ai-resilient-summary",
    "artist-bio-albums",
    "artist-profile",
    "auto-generate-gists",
    "auto-generate-gists-v2",
    "chat",
    "compare-teams",
    "data-consistency-monitor",
    "delete-account",
    "evaluate-summary-quality",
    "fan-sentiment-tracker",
    "fetch-artist-data",
    "fetch-artist-profile",
    "fetch-content",
    "fetch-feed",
    "fetch-music-news",
    "fetch-sports-results",
    "fetch-team-news",
    "fetch-team-news-cached",
    "fluxa-chat",
    "fluxa-daily-drop",
    "fluxa-daily-recap",
    "fluxa-health-check",
    "fluxa-personalized-digest",
    "fluxa-weekly-awards",
    "gather-sources-v2",
    "generate-gist",
    "generate-gist-v2",
    "generate-live-commentary",
    "generate-sports-gist",
    "generate-stories",
    "live-match-monitor",
    "log-artist-search",
    "music-latest",
    "music-search",
    "music-trending",
    "music-trending-searches",
    "news-cache",
    "predict-match",
    "process-deeper-summaries",
    "publish-gist",
    "publish-gist-v2",
    "realtime-session",
    "scrape-trends",
    "search-artists",
    "send-push-notification",
    "spotify-oauth-callback",
    "spotify-oauth-login",
    "spotify-oauth-refresh",
    "sync-fan-entities",
    "sync-sports-data",
    "text-to-speech",
    "track-post-event",
    "update-live-scores",
    "upload-reactions",
    "validate-sports-data",
    "vibe-room",
    "voice-to-fluxa",
    "voice-to-fluxa-stream",
    "voice-to-fluxa-with-limit"
)

$deployed = 0
$failed = 0
$failedFunctions = @()

foreach ($func in $functions) {
    Write-Host "📦 Deploying $func..." -ForegroundColor Cyan
    $result = supabase functions deploy $func --project-ref $ProjectRef 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployed successfully" -ForegroundColor Green
        $deployed++
    } else {
        $message = "$func deployment had issues - may already be deployed or function not found"
        Write-Host "⚠️  $message" -ForegroundColor Yellow
        $failed++
        $failedFunctions += $func
    }
    Write-Host ""
    
    # Small delay to avoid rate limiting
    Start-Sleep -Milliseconds 500
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📊 Deployment Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Successfully deployed: $deployed functions" -ForegroundColor Green
Write-Host "⚠️  Functions with issues: $failed" -ForegroundColor Yellow

if ($failedFunctions.Count -gt 0) {
    Write-Host ""
    Write-Host "Functions that need attention:" -ForegroundColor Yellow
    foreach ($func in $failedFunctions) {
        Write-Host "  - $func" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "✅ Deployment process complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait 10-30 seconds for functions to update" -ForegroundColor White
Write-Host "2. Verify function secrets are set in Supabase Dashboard" -ForegroundColor White
Write-Host "3. Test functions in your application" -ForegroundColor White
Write-Host "4. Check function logs if any issues occur" -ForegroundColor White
