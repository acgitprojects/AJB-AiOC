# Cloudflare Authentication Guide

## Problem: OAuth Authentication Failed

The interactive Wrangler OAuth flow failed. This is common in headless/container environments.

## Solutions

### Solution 1: API Token Authentication (Recommended)

API tokens are better for CI/CD and headless environments.

#### Step 1: Create a Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template, or create a custom token with these permissions:
   - **Account**: Account Settings (Read)
   - **Workers**: Scripts (Write)
   - **R2**: Edit (Read & Write)
4. Copy the token

#### Step 2: Use Token for Deployment

```bash
# Set the API token as an environment variable
export CLOUDFLARE_API_TOKEN="your-token-here"

# Now deploy
npm run deploy:cf
```

Or use the helper script:
```bash
CLOUDFLARE_API_TOKEN="your-token-here" bash scripts/deploy-helper.sh
```

### Solution 2: Interactive OAuth Login

If you prefer to use OAuth:

```bash
# Perform login
npx wrangler login

# Follow the browser prompts to authenticate
# After completion, your credentials will be saved

# Then deploy
npm run deploy:cf
```

### Solution 3: Use Stored Credentials

If you previously authenticated with Wrangler on this machine:

```bash
# Check if you're already authenticated
wrangler whoami

# If yes, try deployment directly
npm run deploy:cf
```

## Deployment Steps

Once authenticated using any of the above methods:

```bash
# Step 1: Install dependencies (if not done)
npm install

# Step 2: Deploy
npm run deploy:cf

# Step 3: After first successful deployment, enable edge caching
npx wrangler r2 bucket create aioc-opennext-cache

# Step 4: Uncomment service bindings in wrangler.toml and re-deploy
# (See CLOUDFLARE_DEPLOYMENT.md for details)
npm run deploy:cf
```

## Troubleshooting

### "No authentication found" error
- Use Solution 1 (API Token) or Solution 2 (OAuth login)

### "Failed to open" when logging in
- This is normal in headless environments
- The OAuth flow will still work; check your terminal for the redirect URL
- If that fails, use API Token authentication instead

### Token/Auth keeps expiring
- API tokens typically last 10 years
- OAuth sessions expire after 10 years
- Consider using a stored API token for reliability

## Security Notes

- **Never commit tokens to git** - use environment variables or `.env` files
- GitHub: Use repository secrets for storing tokens
- Local: Use `.env.local` (in `.gitignore`)
- CI/CD: Store in your pipeline's secret manager
