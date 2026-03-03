#!/bin/bash

# Cloudflare Deployment Helper
# This script handles deployment with proper environment setup

set -e

echo "🚀 Starting Cloudflare deployment..."
echo ""

# Check for required authentication method
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "⚠️  No CLOUDFLARE_API_TOKEN found"
    echo ""
    echo "To deploy, you have two options:"
    echo ""
    echo "Option 1: Use API Token (recommended for CI/CD)"
    echo "  1. Go to: https://dash.cloudflare.com/profile/api-tokens"
    echo "  2. Create a token with these permissions:"
    echo "     - Workers Scripts (Read & Write)"
    echo "     - R2 (Read & Write)"
    echo "     - Account (Read)"
    echo "  3. Export it: export CLOUDFLARE_API_TOKEN='your-token-here'"
    echo "  4. Run: npm run deploy:cf"
    echo ""
    echo "Option 2: Use OAuth (interactive login)"
    echo "  1. Run: npx wrangler login"
    echo "  2. Complete the browser login"
    echo "  3. Run: npm run deploy:cf"
    echo ""
    exit 1
fi

echo "✓ Using CLOUDFLARE_API_TOKEN for authentication"
echo ""

# Step 1: Build
echo "📦 Building Next.js application..."
npm run build:cf

# Step 2: Fix wrangler config
echo "🔧 Fixing wrangler configuration..."
npm run fix:wrangler-config

# Step 3: Deploy
echo "☁️  Deploying to Cloudflare Workers..."
opennextjs-cloudflare deploy

echo ""
echo "✅ Deployment successful!"
echo ""
echo "Next steps for edge caching:"
echo "  1. Create R2 bucket: npx wrangler r2 bucket create aioc-opennext-cache"
echo "  2. Uncomment [[services]] and [[r2_buckets]] in wrangler.toml"
echo "  3. Run deployment again: npm run deploy:cf"
