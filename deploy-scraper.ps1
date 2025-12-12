# PowerShell script to deploy scrape-trends function
# Run this from the project root: .\deploy-scraper.ps1

Write-Host "🚀 Deploying scrape-trends function..." -ForegroundColor Cyan

# Check if Supabase CLI is available
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "⚠️  Supabase CLI not found. Installing via npx..." -ForegroundColor Yellow
    npx supabase functions deploy scrape-trends
} else {
    Write-Host "✅ Using Supabase CLI..." -ForegroundColor Green
    supabase functions deploy scrape-trends
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ scrape-trends function deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Set environment variables in Supabase Dashboard" -ForegroundColor White
    Write-Host "2. Configure cron job: */30 * * * * (every 30 minutes)" -ForegroundColor White
    Write-Host "3. Test manually using: import { runScraper } from '@/lib/runScraper'" -ForegroundColor White
} else {
    Write-Host "❌ Deployment failed. Check the error above." -ForegroundColor Red
    Write-Host "💡 Try: npx supabase login first" -ForegroundColor Yellow
}

