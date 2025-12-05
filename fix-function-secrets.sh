#!/bin/bash
# Quick script to set all required secrets for publish-gist function
# Run this after deploying the function

echo "🔧 Setting function secrets..."
echo ""
echo "Please enter your secrets (or press Enter to skip):"
echo ""

# Get secrets from user or use defaults
read -p "OPENAI_API_KEY: " OPENAI_KEY
read -p "SUPABASE_URL [https://vzjyclgrqoyxbbzplkgw.supabase.co]: " SUPABASE_URL
read -p "SUPABASE_SERVICE_ROLE_KEY: " SERVICE_KEY
read -p "SUPABASE_ANON_KEY: " ANON_KEY

# Use defaults if not provided
SUPABASE_URL=${SUPABASE_URL:-"https://vzjyclgrqoyxbbzplkgw.supabase.co"}

# Set secrets
if [ ! -z "$OPENAI_KEY" ]; then
  echo "Setting OPENAI_API_KEY..."
  supabase secrets set OPENAI_API_KEY="$OPENAI_KEY"
fi

if [ ! -z "$SUPABASE_URL" ]; then
  echo "Setting SUPABASE_URL..."
  supabase secrets set SUPABASE_URL="$SUPABASE_URL"
fi

if [ ! -z "$SERVICE_KEY" ]; then
  echo "Setting SUPABASE_SERVICE_ROLE_KEY..."
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"
fi

if [ ! -z "$ANON_KEY" ]; then
  echo "Setting SUPABASE_ANON_KEY..."
  supabase secrets set SUPABASE_ANON_KEY="$ANON_KEY"
fi

echo ""
echo "✅ Secrets set! Wait 10-30 seconds, then test the function."
echo ""
echo "To verify:"
echo "  supabase secrets list"

