# DevDock Landing Page Design

**Date:** 2026-02-20

## Goal

A single-page marketing site for DevDock that drives direct `.dmg` beta downloads from developer visitors.

## Hosting & Deployment

- **Platform:** GitHub Pages
- **Repo:** New standalone repo `devdock-site` (keeps Tauri app repo clean)
- **Deploy:** GitHub Actions — push to `main` → `astro build` → publish `dist/` to GitHub Pages
- **URL:** `https://<github-username>.github.io/devdock-site/`
- **Download CTA:** Links to the main repo's GitHub Releases page (always latest release, not hardcoded)

## Tech Stack

- **Framework:** Astro (static output, zero client JS)
- **Styling:** Tailwind CSS
- **No UI framework** — pure Astro components only

## Visual Design

**Palette:**
- Background: `#0a0a0f`
- Glass surfaces: `rgba(255,255,255,0.05)` + `backdrop-blur`
- Accent gradient: `#7c3aed` → `#a855f7` (violet-600 → violet-400)
- Text: white / `white/60` muted
- Borders: `rgba(255,255,255,0.08)`

**Style:** Glassmorphism — blurred glass cards on dark gradient background, matching the dock's own UI.

## Project Structure

```
devdock-site/
├── src/
│   ├── pages/
│   │   └── index.astro
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── Features.astro
│   │   ├── Pricing.astro
│   │   ├── Install.astro
│   │   └── Footer.astro
│   └── styles/
│       └── global.css
├── public/
│   └── demo.mp4              # TODO: record screen capture
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
└── .github/
    └── workflows/
        └── deploy.yml
```

## Sections

### 1. Hero
- **Tagline:** "Your AI coding co-pilot, always on top"
- **Subtext:** 1-sentence description of what DevDock does
- **Media:** `<video autoplay loop muted>` of the dock in action (`public/demo.mp4`)
- **CTA:** "Download for macOS" button → GitHub Releases page
- **Note:** macOS 12+ requirement shown below CTA

### 2. Features Grid
3×2 grid of glass cards. Each card: icon + name + 1-line description.

| Feature | Icon | Description |
|---------|------|-------------|
| Smart Screenshot | 📸 | Select any region — AI-numbered elements copied to clipboard |
| Prompt Optimizer | ✨ | Turn rough thoughts into structured prompts via Groq |
| Voice Input | 🎙 | Speak your prompt — transcribed and ready to paste |
| Agent Monitor | 🤖 | See all running AI agents (Claude Code, Cursor) at a glance |
| Preview Window | 🖥 | Live CSS editing in a floating preview panel |
| Workspace Snapshots | 📐 | Save and restore full window layouts instantly |

### 3. Pricing
Two glass cards side by side:

**Free** (forever)
- Smart Screenshot
- Prompt Optimizer
- Custom Action Buttons
- Agent Monitor

**Pro** — $4/mo
- Everything in Free
- Voice Input
- Workspace Snapshots
- Preview CSS editing
- CTA: "Get Pro" → Stripe checkout URL

### 4. Install Instructions
Numbered steps:
1. Download `.dmg` from GitHub Releases
2. Open the `.dmg` — drag DevDock to Applications
3. Launch — the dock appears floating over all windows

Platform note: macOS 12 Monterey or later.

### 5. Footer
- GitHub repo link
- "Built with Tauri + Angular"
- Link to `nir.by`

## Assets Needed

- `public/demo.mp4` — screen recording of dock in use (TODO: record manually)
- Optional: `public/og.png` — Open Graph image for social sharing

## Constraints

- No client-side JS (pure Astro static output)
- No custom backend — all dynamic links are external (GitHub Releases, Stripe)
- macOS-only product — no Windows/Linux download options on this page yet
