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

$functions = @(
    "fetch-content",
    "fetch-news",
    "fetch-music",
    "fetch-sports",
    "publish-gist",
    "publish-gist-v2",
    "spotify-oauth-login",
    "spotify-oauth-callback",
    "spotify-oauth-refresh",
    "generate-gist",
    "generate-gist-v2",
    "text-to-speech",
    "search-artists",
    "add-music-preferences",
    "content-cache",
    "fluxa-chat",
    "fetch-feed",
    "realtime-session",
    "auto-generate-gists",
    "auto-generate-gists-v2",
    "fetch-sports-results",
    "update-live-scores",
    "generate-sports-gist",
    "generate-live-commentary",
    "fetch-artist-data",
    "fetch-artist-profile",
    "fetch-music-news",
    "music-search",
    "music-trending",
    "music-latest",
    "music-trending-searches",
    "log-artist-search",
    "artist-profile",
    "artist-bio-albums",
    "track-post-event",
    "upload-reactions",
    "validate-sports-data",
    "sync-sports-data",
    "sync-fan-entities",
    "fan-sentiment-tracker",
    "compare-teams",
    "predict-match",
    "live-match-monitor",
    "fetch-team-news",
    "fetch-team-news-cached",
    "scrape-trends",
    "admin-refresh-trends",
    "news-cache",
    "ai-news-summary",
    "ai-resilient-summary",
    "process-deeper-summaries",
    "evaluate-summary-quality",
    "data-consistency-monitor",
    "vibe-room",
    "voice-to-fluxa",
    "voice-to-fluxa-with-limit",
    "voice-to-fluxa-stream",
    "fluxa-health-check",
    "fluxa-daily-drop",
    "fluxa-daily-recap",
    "fluxa-weekly-awards",
    "fluxa-personalized-digest",
    "generate-stories",
    "gather-sources-v2",
    "send-push-notification",
    "chat",
    "delete-account"
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
