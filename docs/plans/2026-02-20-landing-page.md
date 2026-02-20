# DevDock Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and deploy a glassmorphism landing page for DevDock to GitHub Pages using Astro + Tailwind, with Hero, Features, Pricing, Install, and Footer sections.

**Architecture:** New standalone repo `devdock-site` at `/Users/mariobustosjmz/Desktop/claude/devdock-site/`. Pure Astro static output (zero client JS), Tailwind for styling, GitHub Actions for automatic deploy to GitHub Pages on push to `main`. The `.dmg` download CTA links to the main repo's GitHub Releases page.

**Tech Stack:** Astro 4, Tailwind CSS 3, GitHub Actions, GitHub Pages

---

### Task 1: Scaffold Astro project

**Files:**
- Create: `/Users/mariobustosjmz/Desktop/claude/devdock-site/` (new directory)
- Create: `package.json`, `astro.config.mjs`, `tailwind.config.mjs`, `tsconfig.json`

**Step 1: Create the project directory and initialize**

```bash
mkdir -p /Users/mariobustosjmz/Desktop/claude/devdock-site
cd /Users/mariobustosjmz/Desktop/claude/devdock-site
git init
```

**Step 2: Create `package.json`**

```json
{
  "name": "devdock-site",
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^4.16.0",
    "@astrojs/tailwind": "^5.1.0",
    "tailwindcss": "^3.4.0"
  }
}
```

**Step 3: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

**Step 4: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
  site: 'https://YOUR_GITHUB_USERNAME.github.io',
  base: '/devdock-site',
});
```

> Note: Replace `YOUR_GITHUB_USERNAME` with the actual GitHub username before deploying.

**Step 5: Create `tailwind.config.mjs`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  theme: {
    extend: {
      colors: {
        surface: 'rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
};
```

**Step 6: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict"
}
```

**Step 7: Create `src/styles/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --accent: #7c3aed;
  --accent-light: #a855f7;
}

html {
  scroll-behavior: smooth;
}

body {
  background: #0a0a0f;
  color: white;
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.gradient-text {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Step 8: Create placeholder video asset**

```bash
mkdir -p /Users/mariobustosjmz/Desktop/claude/devdock-site/public
touch /Users/mariobustosjmz/Desktop/claude/devdock-site/public/demo.mp4
```

> `demo.mp4` is a placeholder. Replace with a real screen recording before publishing.

**Step 9: Create `.gitignore`**

```
node_modules/
dist/
.astro/
```

**Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:4321/` opens (blank page is fine at this stage).

**Step 11: Commit**

```bash
git add .
git commit -m "feat: scaffold astro project"
```

---

### Task 2: Build Hero component

**Files:**
- Create: `src/components/Hero.astro`
- Create: `src/pages/index.astro`

**Step 1: Create `src/components/Hero.astro`**

```astro
---
const RELEASES_URL = 'https://github.com/YOUR_GITHUB_USERNAME/devdock/releases/latest';
---

<section class="relative min-h-screen flex flex-col items-center justify-center px-6 py-24 overflow-hidden">
  <!-- Background gradient -->
  <div class="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-transparent to-purple-950/20 pointer-events-none"></div>
  <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>

  <div class="relative z-10 text-center max-w-4xl mx-auto">
    <!-- Badge -->
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-violet-300 mb-6">
      <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
      Beta available for macOS
    </div>

    <!-- Tagline -->
    <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
      Your AI coding co-pilot,<br/>
      <span class="gradient-text">always on top</span>
    </h1>

    <!-- Subtext -->
    <p class="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10">
      DevDock is a floating developer dock that supercharges your AI coding workflow —
      smart screenshots, prompt optimization, voice input, and agent monitoring without alt-tabbing.
    </p>

    <!-- CTA -->
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a
        href={RELEASES_URL}
        class="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-base transition-all hover:scale-105 active:scale-95 shadow-lg shadow-violet-900/40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download for macOS
      </a>
      <span class="text-xs text-white/30">macOS 12 Monterey or later · Free to start</span>
    </div>

    <!-- Demo video -->
    <div class="mt-16 rounded-2xl overflow-hidden glass shadow-2xl shadow-violet-950/50 max-w-2xl mx-auto">
      <video
        autoplay
        loop
        muted
        playsinline
        class="w-full"
        poster="/devdock-site/demo-poster.png"
      >
        <source src="/devdock-site/demo.mp4" type="video/mp4" />
        <!-- Fallback: static screenshot -->
        <img src="/devdock-site/demo-poster.png" alt="DevDock floating dock" />
      </video>
    </div>
  </div>
</section>
```

> Replace `YOUR_GITHUB_USERNAME` with the actual value.

**Step 2: Create `src/pages/index.astro`**

```astro
---
import '../styles/global.css';
import Hero from '../components/Hero.astro';
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DevDock — AI Coding Co-pilot</title>
    <meta name="description" content="A floating developer dock for AI coding tools. Smart screenshots, prompt optimizer, voice input, agent monitor." />
    <link rel="icon" type="image/svg+xml" href="/devdock-site/favicon.svg" />
  </head>
  <body>
    <Hero />
  </body>
</html>
```

**Step 3: Run dev server and verify**

```bash
npm run dev
```

Expected: Hero section renders with gradient background, tagline, CTA button, and video placeholder.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: hero section"
```

---

### Task 3: Build Features grid component

**Files:**
- Create: `src/components/Features.astro`
- Modify: `src/pages/index.astro` (add `<Features />`)

**Step 1: Create `src/components/Features.astro`**

```astro
---
const features = [
  {
    icon: '📸',
    name: 'Smart Screenshot',
    description: 'Select any screen region — AI-numbered UI elements copied straight to clipboard.',
  },
  {
    icon: '✨',
    name: 'Prompt Optimizer',
    description: 'Turn rough thoughts into structured, context-aware prompts via Groq in under 200ms.',
  },
  {
    icon: '🎙',
    name: 'Voice Input',
    description: 'Speak your prompt — transcribed via Whisper and ready to paste into any AI tool.',
  },
  {
    icon: '🤖',
    name: 'Agent Monitor',
    description: 'See all running AI agents (Claude Code, Cursor, Aider) with live CPU and token metrics.',
  },
  {
    icon: '🖥',
    name: 'Preview Window',
    description: 'Float a live preview with CSS injection for instant visual iteration.',
  },
  {
    icon: '📐',
    name: 'Workspace Snapshots',
    description: 'Save your entire window layout and restore it in one click.',
  },
];
---

<section id="features" class="py-24 px-6">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold mb-4">Everything you need, floating above</h2>
      <p class="text-white/50 text-lg max-w-xl mx-auto">
        10 features purpose-built for developers who live inside AI coding tools.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {features.map((f) => (
        <div class="glass rounded-2xl p-6 flex flex-col gap-3 hover:border-violet-500/30 transition-colors">
          <span class="text-3xl">{f.icon}</span>
          <h3 class="font-semibold text-white text-base">{f.name}</h3>
          <p class="text-white/50 text-sm leading-relaxed">{f.description}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Step 2: Add to `src/pages/index.astro`**

```astro
---
import '../styles/global.css';
import Hero from '../components/Hero.astro';
import Features from '../components/Features.astro';
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DevDock — AI Coding Co-pilot</title>
    <meta name="description" content="A floating developer dock for AI coding tools. Smart screenshots, prompt optimizer, voice input, agent monitor." />
    <link rel="icon" type="image/svg+xml" href="/devdock-site/favicon.svg" />
  </head>
  <body>
    <Hero />
    <Features />
  </body>
</html>
```

**Step 3: Verify in browser**

Expected: 3×2 glass card grid below hero, each card has emoji, name, description.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: features grid section"
```

---

### Task 4: Build Pricing component

**Files:**
- Create: `src/components/Pricing.astro`
- Modify: `src/pages/index.astro` (add `<Pricing />`)

**Step 1: Create `src/components/Pricing.astro`**

```astro
---
const STRIPE_URL = 'https://buy.stripe.com/PLACEHOLDER';
const RELEASES_URL = 'https://github.com/YOUR_GITHUB_USERNAME/devdock/releases/latest';

const freeTier = [
  'Smart Screenshot',
  'Prompt Optimizer',
  'Custom Action Buttons',
  'Agent Monitor',
  'Prompt History',
  'Educational Shorts',
];

const proTier = [
  'Everything in Free',
  'Voice Input',
  'Workspace Snapshots',
  'Preview CSS editing',
  'Priority support',
];
---

<section id="pricing" class="py-24 px-6">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold mb-4">Simple pricing</h2>
      <p class="text-white/50 text-lg">Start free. Upgrade when you need more.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
      <!-- Free -->
      <div class="glass rounded-2xl p-8 flex flex-col">
        <div class="mb-6">
          <p class="text-sm text-white/40 uppercase tracking-wider font-medium mb-1">Free</p>
          <p class="text-4xl font-bold">$0</p>
          <p class="text-sm text-white/40 mt-1">Forever</p>
        </div>
        <ul class="flex flex-col gap-2.5 mb-8 flex-1">
          {freeTier.map((f) => (
            <li class="flex items-center gap-2.5 text-sm text-white/70">
              <svg class="w-4 h-4 text-violet-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {f}
            </li>
          ))}
        </ul>
        <a
          href={RELEASES_URL}
          class="block text-center py-2.5 px-4 rounded-xl glass border border-white/10 hover:border-white/20 text-sm font-medium transition-colors"
        >
          Download free
        </a>
      </div>

      <!-- Pro -->
      <div class="rounded-2xl p-8 flex flex-col bg-gradient-to-br from-violet-600/20 to-purple-600/10 border border-violet-500/30">
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm text-violet-300 uppercase tracking-wider font-medium">Pro</p>
            <span class="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs">Popular</span>
          </div>
          <p class="text-4xl font-bold">$4</p>
          <p class="text-sm text-white/40 mt-1">per month</p>
        </div>
        <ul class="flex flex-col gap-2.5 mb-8 flex-1">
          {proTier.map((f) => (
            <li class="flex items-center gap-2.5 text-sm text-white/80">
              <svg class="w-4 h-4 text-violet-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {f}
            </li>
          ))}
        </ul>
        <a
          href={STRIPE_URL}
          class="block text-center py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95"
        >
          Get Pro
        </a>
      </div>
    </div>
  </div>
</section>
```

> Replace `STRIPE_URL` with the real Stripe checkout URL from `.env` when available.

**Step 2: Add to `src/pages/index.astro`**

Add `import Pricing from '../components/Pricing.astro';` to the frontmatter and `<Pricing />` after `<Features />`.

**Step 3: Verify in browser**

Expected: Two pricing cards — Free (dark glass) and Pro (violet gradient). Checklist items render with violet checkmarks.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: pricing section"
```

---

### Task 5: Build Install component

**Files:**
- Create: `src/components/Install.astro`
- Modify: `src/pages/index.astro` (add `<Install />`)

**Step 1: Create `src/components/Install.astro`**

```astro
---
const RELEASES_URL = 'https://github.com/YOUR_GITHUB_USERNAME/devdock/releases/latest';

const steps = [
  {
    n: '1',
    title: 'Download the .dmg',
    body: 'Click the button below to get the latest beta from GitHub Releases.',
  },
  {
    n: '2',
    title: 'Open & drag to Applications',
    body: 'Double-click the .dmg, then drag the DevDock icon to your Applications folder.',
  },
  {
    n: '3',
    title: 'Launch — dock appears',
    body: 'Open DevDock from Applications or Spotlight. The dock floats above all your windows.',
  },
];
---

<section id="install" class="py-24 px-6">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold mb-4">Up in 60 seconds</h2>
      <p class="text-white/50 text-lg">No configuration. No account required to start.</p>
    </div>

    <div class="flex flex-col gap-6 mb-12">
      {steps.map((s) => (
        <div class="glass rounded-2xl p-6 flex items-start gap-5">
          <div class="shrink-0 w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-sm">
            {s.n}
          </div>
          <div>
            <h3 class="font-semibold text-white mb-1">{s.title}</h3>
            <p class="text-white/50 text-sm">{s.body}</p>
          </div>
        </div>
      ))}
    </div>

    <div class="text-center">
      <a
        href={RELEASES_URL}
        class="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-violet-900/40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download for macOS
      </a>
      <p class="text-xs text-white/30 mt-3">Requires macOS 12 Monterey or later</p>
    </div>
  </div>
</section>
```

**Step 2: Add to `src/pages/index.astro`**

Add `import Install from '../components/Install.astro';` and `<Install />` after `<Pricing />`.

**Step 3: Verify in browser**

Expected: 3 numbered steps in glass cards, download button below.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: install section"
```

---

### Task 6: Build Footer component

**Files:**
- Create: `src/components/Footer.astro`
- Modify: `src/pages/index.astro` (add `<Footer />`)

**Step 1: Create `src/components/Footer.astro`**

```astro
---
const GITHUB_URL = 'https://github.com/YOUR_GITHUB_USERNAME/devdock';
const NIRBY_URL = 'https://nir.by/';
---

<footer class="py-12 px-6 border-t border-white/5">
  <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
    <div class="flex items-center gap-1">
      <span>Built with</span>
      <a href="https://tauri.app" target="_blank" rel="noopener" class="hover:text-white/60 transition-colors">Tauri</a>
      <span>+</span>
      <a href="https://angular.dev" target="_blank" rel="noopener" class="hover:text-white/60 transition-colors">Angular</a>
    </div>
    <div class="flex items-center gap-6">
      <a href={GITHUB_URL} target="_blank" rel="noopener" class="hover:text-white/60 transition-colors flex items-center gap-1.5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
        GitHub
      </a>
      <a href={NIRBY_URL} target="_blank" rel="noopener" class="hover:text-white/60 transition-colors">
        nir.by
      </a>
    </div>
  </div>
</footer>
```

**Step 2: Add to `src/pages/index.astro`**

Add `import Footer from '../components/Footer.astro';` and `<Footer />` at the end of `<body>`.

**Step 3: Final `src/pages/index.astro` should look like:**

```astro
---
import '../styles/global.css';
import Hero from '../components/Hero.astro';
import Features from '../components/Features.astro';
import Pricing from '../components/Pricing.astro';
import Install from '../components/Install.astro';
import Footer from '../components/Footer.astro';
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DevDock — AI Coding Co-pilot</title>
    <meta name="description" content="A floating developer dock for AI coding tools. Smart screenshots, prompt optimizer, voice input, agent monitor." />
    <link rel="icon" type="image/svg+xml" href="/devdock-site/favicon.svg" />
  </head>
  <body>
    <Hero />
    <Features />
    <Pricing />
    <Install />
    <Footer />
  </body>
</html>
```

**Step 4: Verify full page in browser**

```bash
npm run dev
```

Open `http://localhost:4321/devdock-site/`. Scroll through all 5 sections. Check:
- [ ] Hero renders gradient background, tagline, CTA, video placeholder
- [ ] Features grid 3×2 glass cards
- [ ] Pricing two cards, free + pro
- [ ] Install 3 numbered steps + download CTA
- [ ] Footer with GitHub + nir.by links

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: footer + complete page assembly"
```

---

### Task 7: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Create `.github/workflows/deploy.yml`**

```bash
mkdir -p .github/workflows
```

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

**Step 2: Verify `astro.config.mjs` has correct `site` and `base`**

```js
// astro.config.mjs
site: 'https://YOUR_GITHUB_USERNAME.github.io',
base: '/devdock-site',
```

> Replace `YOUR_GITHUB_USERNAME` with actual username.

**Step 3: Commit**

```bash
git add .github/
git commit -m "ci: github actions deploy to github pages"
```

---

### Task 8: Create GitHub repo and push

**Step 1: Create repo on GitHub**

Go to `https://github.com/new` and create a public repo named `devdock-site`. Do not initialize with README.

**Step 2: Add remote and push**

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/devdock-site.git
git branch -M main
git push -u origin main
```

**Step 3: Enable GitHub Pages**

In the repo on GitHub:
- Go to **Settings → Pages**
- Source: **GitHub Actions**
- Save

**Step 4: Verify deploy**

Wait ~1 minute, then open:
`https://YOUR_GITHUB_USERNAME.github.io/devdock-site/`

Expected: Landing page loads with all 5 sections.

**Step 5: Note TODO assets**

- `public/demo.mp4` — record a 30–60s screen capture of the dock in use and replace the placeholder
- `public/favicon.svg` — add a favicon (can be a simple violet circle SVG)

---

## TODO After Plan Completion

- [ ] Record `demo.mp4` screen capture of dock in use
- [ ] Create `favicon.svg`
- [ ] Replace `YOUR_GITHUB_USERNAME` in all files with actual GitHub username
- [ ] Replace Stripe `PLACEHOLDER` URL with real checkout URL
- [ ] Set up GitHub repo for the main `devdock` app and push (needed for the `.dmg` download link to work)
