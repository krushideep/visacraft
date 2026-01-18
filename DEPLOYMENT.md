# Deployment Guide - GitHub Pages

Complete guide to deploying the Visa Checklist Generator on GitHub Pages using GitHub Actions.

## Prerequisites

- GitHub account with repository access
- GitHub Copilot Pro subscription  
- GitHub token configured (see [GITHUB_MODELS_SETUP.md](GITHUB_MODELS_SETUP.md))

## Local Setup

For local development setup, see [GITHUB_MODELS_SETUP.md](GITHUB_MODELS_SETUP.md).

For quick reference:
```bash
npm install
npm run dev
```

## Production Deployment

### Step 1: Add GitHub Secret

1. Go to your repository: https://github.com/krushideep/visacraft
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `VITE_GITHUB_TOKEN`
5. Value: Paste your GitHub token (see [GITHUB_MODELS_SETUP.md](GITHUB_MODELS_SETUP.md#1-generate-github-personal-access-token))
6. Click "Add secret"

⚠️ **Important:** Never commit `.env.local` to git - use secrets instead!

### Step 2: Enable GitHub Pages

1. Go to Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main` → `/ (root)`
4. Click "Save"

### Step 3: Deploy

1. Commit and push changes:
```bash
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

2. Monitor deployment:
   - Go to Actions tab
   - Watch the workflow run
   - After success (~2 min), site is live

### Step 4: Access Live Site

🌐 **Your app:** https://krushideep.github.io/visacraft

The workflow automatically rebuilds and deploys on every push to main.

## GitHub Actions Workflow

The workflow (`.github/workflows/deploy.yml`) automatically:
1. Checks out code on push to main
2. Installs Node dependencies
3. Passes `VITE_GITHUB_TOKEN` from GitHub Secrets
4. Builds the Vite app (creates `dist/` folder)
5. Uploads artifacts to GitHub Pages
6. Deploys to your live site

**Workflow file location:** `.github/workflows/deploy.yml`

## Troubleshooting

### Build fails: "GitHub token not configured"
1. Add `VITE_GITHUB_TOKEN` to GitHub Secrets (Settings → Secrets)
2. Rebuild by pushing new commit

### Workflow not running
1. Check branch is `main` (not `master`)
2. Verify workflow file exists: `.github/workflows/deploy.yml`
3. Go to Actions tab → click "Re-run jobs" to manually trigger

### For API & token errors
See [GITHUB_MODELS_SETUP.md](GITHUB_MODELS_SETUP.md#troubleshooting) for:
- "GitHub token not found"
- "Invalid token" / 401 errors
- Rate limiting (15 req/min)
- Token exposure risks

## Build & Deploy Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Monitoring Deployments

1. **Actions Tab:** https://github.com/krushideep/visacraft/actions
   - View all workflow runs
   - Check logs for errors
   - See deployment status

2. **GitHub Pages Settings:** 
   - Settings → Pages
   - View deployment history

## Custom Domain (Optional)

To use a custom domain with GitHub Pages:
1. Settings → Pages → Custom domain
2. Enter your domain (e.g., `visacraft.example.com`)
3. Update DNS records (see GitHub docs)
4. Enable HTTPS

## Support & Resources

- **GitHub Pages Docs:** https://docs.github.com/pages
- **GitHub Actions Docs:** https://docs.github.com/actions
- **GitHub Models Setup:** [GITHUB_MODELS_SETUP.md](GITHUB_MODELS_SETUP.md)
- **Report Issues:** https://github.com/krushideep/visacraft/issues
