# PowerShell script to update .env.local with correct Supabase URL
# Run this script: .\update-env.ps1

$envFile = ".env.local"
$oldUrl = "https://zikzuwomznlpgvrftcpf.supabase.co"
$newUrl = "https://vzjyclgrqoyxbbzplkgw.supabase.co"

if (Test-Path $envFile) {
    Write-Host "Updating .env.local file..." -ForegroundColor Yellow
    
    # Read the file
    $content = Get-Content $envFile -Raw
    
    # Replace the old URL with new URL
    $content = $content -replace [regex]::Escape($oldUrl), $newUrl
    
    # Write back to file
    $content | Set-Content $envFile -NoNewline
    
    Write-Host "✅ Updated VITE_SUPABASE_URL to: $newUrl" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Restart your dev server for changes to take effect!" -ForegroundColor Red
    Write-Host "   1. Stop the server (Ctrl+C)" -ForegroundColor Yellow
    Write-Host "   2. Run: npm run dev" -ForegroundColor Yellow
} else {
    Write-Host "❌ .env.local file not found!" -ForegroundColor Red
}

