# Visa Checklist Generator

An AI-powered visa requirements checker that uses GitHub Copilot Pro's free GitHub Models API to generate accurate visa checklists for international travel.

## Features

✨ **AI-Powered** - Uses GPT-4o via GitHub Models API  
🚀 **Lightning Fast** - 1-3 second responses with 7-day caching  
📋 **Schengen Fast-Pass** - Instant results for EU citizens traveling within Schengen  
🆓 **Free** - Works with GitHub Copilot Pro (no extra costs)  
🔒 **Private** - No backend, token only stored locally  
📱 **Responsive** - Works on all devices  

## Live Demo

🌐 https://krushideep.github.io/visacraft

## Quick Start

### Prerequisites
- Node.js 18+
- GitHub Copilot Pro subscription
- GitHub Personal Access Token (see [GITHUB_MODELS_SETUP.md](GITHUB_MODELS_SETUP.md))

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment (see [GITHUB_MODELS_SETUP.md](GITHUB_MODELS_SETUP.md#setup-one-time)):**
   ```bash
   echo "VITE_GITHUB_TOKEN=ghp_your_token_here" > .env.local
   ```

3. **Run locally:**
   ```bash
   npm run dev
   ```
   App opens at `http://localhost:3000`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages setup with GitHub Actions.

## Architecture

1. **Schengen Fast-Pass** - EU→EU travel: instant static response
2. **Smart Cache** - Results cached 7 days in localStorage
3. **GitHub Models API** - New routes queried via GPT-4o
4. **JSON Response** - Structured visa requirements

## Project Structure

```
├── services/
│   └── aiService.ts          # GitHub Models API integration
├── components/
│   ├── Header.tsx            # App header
│   └── ChecklistResult.tsx   # Visa requirements display
├── App.tsx                   # Main React component
├── constants.ts              # Country codes, Schengen list
├── types.ts                  # TypeScript interfaces
└── .env.local                # GitHub token (local only)
```

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **AI:** GitHub Models API (GPT-4o)
- **Deployment:** GitHub Pages + GitHub Actions 
- **Caching:** localStorage (7 days)

## Documentation

- [GITHUB_MODELS_SETUP.md](GITHUB_MODELS_SETUP.md) - Token generation, cost, available models
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deploy to GitHub Pages with GitHub Actions

## License

MIT
