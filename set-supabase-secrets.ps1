# Read .env.local and set Supabase secrets
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "Error: $envFile not found"
    exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim() -replace "^['`"]|['`"]$", ""
        $envVars[$key] = $value
    }
}

# Extract values we need
$spotifyClientId = $envVars["VITE_SPOTIFY_CLIENT_ID"] -or $envVars["SPOTIFY_CLIENT_ID"]
$spotifyClientSecret = $envVars["SPOTIFY_CLIENT_SECRET"]
$supabaseUrl = $envVars["VITE_SUPABASE_URL"]
$frontendUrl = $envVars["FRONTEND_URL"] -or "https://tryfluxa.vercel.app"

# Build redirect URI
if ($supabaseUrl) {
    $projectId = if ($supabaseUrl -match 'https://([^.]+)\.supabase\.co') { $matches[1] } else { $null }
    if ($projectId) {
        $redirectUri = "https://$projectId.supabase.co/functions/v1/spotify-oauth-callback"
    } else {
        $redirectUri = "https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-callback"
    }
} else {
    $redirectUri = "https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/spotify-oauth-callback"
}

Write-Host "Setting Supabase secrets..."
Write-Host ""

if ($spotifyClientId) {
    Write-Host "Setting SPOTIFY_CLIENT_ID..."
    & supabase secrets set SPOTIFY_CLIENT_ID=$spotifyClientId
} else {
    Write-Host "Warning: SPOTIFY_CLIENT_ID not found in .env.local"
}

if ($spotifyClientSecret) {
    Write-Host "Setting SPOTIFY_CLIENT_SECRET..."
    & supabase secrets set SPOTIFY_CLIENT_SECRET=$spotifyClientSecret
} else {
    Write-Host "Warning: SPOTIFY_CLIENT_SECRET not found in .env.local"
}

Write-Host "Setting SPOTIFY_REDIRECT_URI=$redirectUri"
& supabase secrets set SPOTIFY_REDIRECT_URI=$redirectUri

Write-Host "Setting SPOTIFY_API_BASE=https://api.spotify.com/v1"
& supabase secrets set SPOTIFY_API_BASE="https://api.spotify.com/v1"

Write-Host "Setting FRONTEND_URL=$frontendUrl"
& supabase secrets set FRONTEND_URL=$frontendUrl

Write-Host ""
Write-Host "Deploying Edge Functions..."
Write-Host ""

Write-Host "Deploying spotify-oauth-login..."
& supabase functions deploy spotify-oauth-login

Write-Host ""
Write-Host "Deploying spotify-oauth-callback..."
& supabase functions deploy spotify-oauth-callback

Write-Host ""
Write-Host "Done!"
