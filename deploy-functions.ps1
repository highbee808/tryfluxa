# PowerShell script to deploy all Edge Functions
# Run this script: .\deploy-functions.ps1

Write-Host "🚀 Deploying Edge Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing Supabase CLI..." -ForegroundColor Yellow
    
    # Try to install via Scoop
    $scoopInstalled = Get-Command scoop -ErrorAction SilentlyContinue
    if ($scoopInstalled) {
        Write-Host "Installing via Scoop..." -ForegroundColor Yellow
        scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
        scoop install supabase
    } else {
        Write-Host "Scoop not found. Please install Supabase CLI manually:" -ForegroundColor Yellow
        Write-Host "1. Download from: https://github.com/supabase/cli/releases" -ForegroundColor Yellow
        Write-Host "2. Or install Scoop first, then run this script again" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To install Scoop (run as Administrator):" -ForegroundColor Cyan
        Write-Host "Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor White
        Write-Host "irm get.scoop.sh | iex" -ForegroundColor White
        exit 1
    }
}

# Check if logged in
Write-Host "Checking Supabase login..." -ForegroundColor Yellow
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Logging in..." -ForegroundColor Yellow
    supabase login
}

# Link project
Write-Host ""
Write-Host "Linking project..." -ForegroundColor Yellow
supabase link --project-ref vzjyclgrqoyxbbzplkgw

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to link project" -ForegroundColor Red
    exit 1
}

# Deploy functions
Write-Host ""
Write-Host "Deploying functions..." -ForegroundColor Yellow
Write-Host ""

$functions = @("publish-gist", "generate-gist", "text-to-speech")

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Cyan
    supabase functions deploy $func
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy $func" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait 10-30 seconds for functions to update" -ForegroundColor White
Write-Host "2. Test in Admin panel" -ForegroundColor White

