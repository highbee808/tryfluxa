# Validation script to check for old project URLs and hardcoded references
# Run this script: .\scripts\validate-project-urls.ps1

$oldProjectRef = "zikzuwomznlpgvrftcpf"
$newProjectRef = "vzjyclgrqoyxbbzplkgw"
$oldUrl = "https://zikzuwomznlpgvrftcpf.supabase.co"
$newUrl = "https://vzjyclgrqoyxbbzplkgw.supabase.co"

Write-Host "🔍 Validating Supabase Project References" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()
$checkedFiles = 0

# Directories to check (excluding node_modules, .git, etc.)
$directories = @(
    "src",
    "supabase/functions"
)

# File patterns to check
$patterns = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.json", "*.toml", "*.env*")

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "Checking directory: $dir" -ForegroundColor Yellow
        
        foreach ($pattern in $patterns) {
            $files = Get-ChildItem -Path $dir -Filter $pattern -Recurse -ErrorAction SilentlyContinue | 
                     Where-Object { 
                         $_.FullName -notmatch "node_modules" -and
                         $_.FullName -notmatch "\.git" -and
                         $_.FullName -notmatch "dist" -and
                         $_.FullName -notmatch "build"
                     }
            
            foreach ($file in $files) {
                $checkedFiles++
                $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
                
                if ($content) {
                    # Check for old project references
                    if ($content -match $oldProjectRef) {
                        $errors += "❌ $($file.FullName) - Contains old project ref: $oldProjectRef"
                    }
                    
                    if ($content -match [regex]::Escape($oldUrl)) {
                        $errors += "❌ $($file.FullName) - Contains old project URL: $oldUrl"
                    }
                    
                    # Check for hardcoded anon keys (JWT tokens)
                    if ($content -match "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" -and 
                        $file.Name -notlike "*.md" -and 
                        $file.Name -notlike "*example*" -and
                        $file.Name -notlike "*template*") {
                        $warnings += "⚠️  $($file.FullName) - May contain hardcoded JWT token"
                    }
                    
                    # Check for hardcoded Supabase URLs (but allow env variable references)
                    $hardcodedUrlPattern = 'https://[a-zA-Z0-9]+\.supabase\.co'
                    if ($content -match $hardcodedUrlPattern) {
                        # Check if it's in an env variable reference (OK)
                        if ($content -notmatch 'import\.meta\.env|process\.env|\$env|Deno\.env|VITE_SUPABASE') {
                            $lines = $content -split "`n"
                            for ($i = 0; $i -lt $lines.Count; $i++) {
                                if ($lines[$i] -match $hardcodedUrlPattern) {
                                    $warnings += "⚠️  $($file.FullName):$($i+1) - Hardcoded Supabase URL found: $($matches[0])"
                                    break
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📊 Validation Results" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files checked: $checkedFiles" -ForegroundColor White
Write-Host ""

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ No issues found! All project references are correct." -ForegroundColor Green
    Write-Host ""
    Write-Host "Verification:" -ForegroundColor Cyan
    Write-Host "  ✅ No old project references ($oldProjectRef)" -ForegroundColor Green
    Write-Host "  ✅ No old project URLs ($oldUrl)" -ForegroundColor Green
    Write-Host "  ✅ No hardcoded tokens or URLs found" -ForegroundColor Green
} else {
    if ($errors.Count -gt 0) {
        Write-Host "❌ ERRORS FOUND ($($errors.Count)):" -ForegroundColor Red
        Write-Host ""
        foreach ($error in $errors) {
            Write-Host "  $error" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
        Write-Host ""
        foreach ($warning in $warnings) {
            Write-Host "  $warning" -ForegroundColor Yellow
        }
        Write-Host ""
    }
}

# Check environment variables
Write-Host "Environment Variables Check:" -ForegroundColor Cyan
Write-Host ""

$envUrl = $env:VITE_SUPABASE_URL
if ($envUrl) {
    if ($envUrl -match $oldProjectRef) {
        Write-Host "❌ VITE_SUPABASE_URL contains old project: $envUrl" -ForegroundColor Red
        $errors += "Environment variable VITE_SUPABASE_URL points to old project"
    } elseif ($envUrl -match $newProjectRef) {
        Write-Host "✅ VITE_SUPABASE_URL is correct: $envUrl" -ForegroundColor Green
    } else {
        Write-Host "⚠️  VITE_SUPABASE_URL is set but doesn't match expected projects" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  VITE_SUPABASE_URL not set in environment" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
    Write-Host "✅ VALIDATION PASSED - No critical errors found" -ForegroundColor Green
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  Review warnings above for potential improvements" -ForegroundColor Yellow
    }
    exit 0
} else {
    Write-Host "❌ VALIDATION FAILED - Please fix errors before deploying" -ForegroundColor Red
    exit 1
}
