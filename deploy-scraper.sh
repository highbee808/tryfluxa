#!/bin/bash
# Bash script to deploy scrape-trends function
# Run this from the project root: ./deploy-scraper.sh

echo "🚀 Deploying scrape-trends function..."

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "✅ Using Supabase CLI..."
    supabase functions deploy scrape-trends
else
    echo "⚠️  Supabase CLI not found. Using npx..."
    npx supabase functions deploy scrape-trends
fi

if [ $? -eq 0 ]; then
    echo "✅ scrape-trends function deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set environment variables in Supabase Dashboard"
    echo "2. Configure cron job: */30 * * * * (every 30 minutes)"
    echo "3. Test manually using: import { runScraper } from '@/lib/runScraper'"
else
    echo "❌ Deployment failed. Check the error above."
    echo "💡 Try: npx supabase login first"
fi

