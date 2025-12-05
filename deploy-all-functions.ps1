# Deploy All Functions Script
# Run this after restarting terminal and ensuring supabase CLI is in PATH

Write-Host "🚀 Deploying All Edge Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if CLI is available
try {
    $version = supabase --version 2>&1
    Write-Host "✅ Supabase CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found in PATH" -ForegroundColor Red
    Write-Host "Please restart your terminal or add CLI to PATH" -ForegroundColor Yellow
    exit 1
}

# Link project
Write-Host "📎 Linking project..." -ForegroundColor Yellow
supabase link --project-ref vzjyclgrqoyxbbzplkgw

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Project might already be linked, continuing..." -ForegroundColor Yellow
}

Write-Host ""

# Deploy functions
$functions = @("publish-gist", "generate-gist", "text-to-speech")

foreach ($func in $functions) {
    Write-Host "📦 Deploying $func..." -ForegroundColor Cyan
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
Write-Host "1. Wait 30 seconds for functions to update" -ForegroundColor White
Write-Host "2. Test in Admin panel" -ForegroundColor White
Write-Host "3. Check function logs if there are errors" -ForegroundColor White

