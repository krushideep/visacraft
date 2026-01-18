# GitHub Models API Setup

Complete guide to using GitHub Models API with your GitHub Copilot Pro account.

### 1. Generate GitHub Personal Access Token
1. Go to https://github.com/settings/tokens/new
2. Name it: "Visa Checklist GitHub Models"
3. Select scopes: 
   - ✅ `repo` (full control of private repositories)
   - ✅ `read:user` (read user profile data)
4. Click "Generate token"
5. Copy the token

### 2. Add to Environment
Create `.env.local`:
```
VITE_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Locally
```bash
npm run dev
```

## Cost

**FREE!** 🎉
- GitHub Models API is FREE for GitHub Copilot Pro subscribers
- Rate limits: 15 requests per minute
- No credit card required
- Includes: Claude 3.5 Sonnet, GPT-4, Mistral, etc.

## Deployment to GitHub Pages

### With GitHub Actions

1. **Add token as secret:**
   - Go to repo → Settings → Secrets and variables → Actions
   - New secret: `VITE_GITHUB_TOKEN` = your token from step 1
   - ⚠️ NEVER commit token to git - use secrets!

2. **Create `.github/workflows/deploy.yml`:**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
        env:
          VITE_GITHUB_TOKEN: ${{ secrets.VITE_GITHUB_TOKEN }}
      - uses: actions/upload-pages-artifact@v2
        with:
          path: dist
      - uses: actions/deploy-pages@v2
```

3. **Enable Pages:**
   - Settings → Pages → Source: GitHub Actions

## Available Models via GitHub Models

- **Claude 3.5 Sonnet** ⭐ (Recommended - best accuracy)
- Claude 3 Opus
- GPT-4 Turbo
- Mistral Large
- Llama 2/3

## Features

✅ **Accurate results** - Claude 3.5 Sonnet for visa requirements  
✅ **Free** - Included with Copilot Pro  
✅ **Fast** - 1-3 second response time  
✅ **Cached** - 7-day local caching  
✅ **Secure** - Token only used at build time or on your machine  
✅ **Scalable** - Deploy to GitHub Pages instantly  

## Troubleshooting

### "Invalid token" error
- Check token hasn't expired
- Verify scopes: `repo` and `read:user` selected
- Generate new token if needed

### Rate limiting (15 req/min)
- Results are cached 7 days automatically
- Same country pairs won't hit API again

### Token exposure
- ⚠️ Never commit `.env.local` to git
- Already in `.gitignore` ✓
- Use GitHub Secrets for CI/CD

## Support

- GitHub Models: https://github.com/models
- Pricing: https://github.com/models#pricing
- Copilot Pro: https://github.com/copilot/pro
