# PowerShell script to deploy all Edge Functions to the correct Supabase project
# This script calls the comprehensive deployment script in the scripts folder
# Run this script: .\deploy-functions.ps1

param(
    [string]$ProjectRef = "vzjyclgrqoyxbbzplkgw"
)

# Call the comprehensive deployment script
& "$PSScriptRoot\scripts\deploy-functions.ps1" -ProjectRef $ProjectRef
