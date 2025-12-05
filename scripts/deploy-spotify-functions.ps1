# PowerShell script to deploy Spotify and Music-related Edge Functions
# Usage: .\scripts\deploy-spotify-functions.ps1

param(
    [string]$ProjectRef = "vzjyclgrqoyxbbzplkgw"
)

Write-Host "🚀 Deploying Spotify & Music Functions..." -ForegroundColor Cyan
Write-Host "Project Reference: $ProjectRef" -ForegroundColor Yellow

# List of functions to deploy
$functions = @(
    "spotify-oauth-login",
    "spotify-oauth-refresh",
    "spotify-oauth-callback",
    "search-artists",
    "music-search",
    "music-latest",
    "music-trending",
    "music-trending-searches"
)

$successCount = 0
$failedCount = 0
$failedFunctions = @()

foreach ($func in $functions) {
    Write-Host "`n📦 Deploying $func..." -ForegroundColor Cyan
    
    $result = supabase functions deploy $func --project-ref $ProjectRef 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployed successfully" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "❌ $func deployment failed" -ForegroundColor Red
        Write-Host $result
        $failedCount++
        $failedFunctions += $func
    }
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "📊 Deployment Summary" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "✅ Successful: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failedCount" -ForegroundColor Red

if ($failedFunctions.Count -gt 0) {
    Write-Host "`n⚠️  Failed Functions:" -ForegroundColor Yellow
    foreach ($func in $failedFunctions) {
        Write-Host "   - $func" -ForegroundColor Yellow
    }
}

Write-Host "`n🔗 Verify functions at:" -ForegroundColor Cyan
Write-Host "   https://$ProjectRef.supabase.co/functions/v1/spotify-oauth-login" -ForegroundColor White
Write-Host "   https://$ProjectRef.supabase.co/functions/v1/search-artists" -ForegroundColor White

if ($failedCount -eq 0) {
    Write-Host "`n🎉 All functions deployed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  Some functions failed to deploy. Check errors above." -ForegroundColor Yellow
    exit 1
}
