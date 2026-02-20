# DevDock First Release — Complete Checklist

> **Status as of 2026-02-20:** CI building v0.2.0-beta (run #22240993987).
> Work through sections in order. Each item is a concrete action with exact commands.

---

## 0. CI Status (Active Now)

| Job | Status |
|-----|--------|
| macOS arm64 (.dmg) | building |
| macOS x64 (.dmg) | building |
| Windows (.msi) | building |
| Linux (.AppImage) | building |

Monitor: `gh run watch --repo mariobustosjmz/claudeDock`

**Known fix applied:** `macos-permissions` moved to `capabilities/macos.json` (platform-specific). Should unblock Windows/Linux builds.

---

## 1. GitHub Repository

### 1.1 Add Repository Secrets
Go to: **github.com/mariobustosjmz/claudeDock → Settings → Secrets and variables → Actions**

| Secret Name | Value | How to get it |
|-------------|-------|---------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Private key content | See §1.2 below |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key password (can be empty) | See §1.2 below |

### 1.2 Generate Tauri Signing Key
```bash
cd /Users/mariobustosjmz/Desktop/claude/dock/devdock
pnpm tauri signer generate -w ~/.tauri/devdock.key
# Prints: public key (save it for tauri.conf.json)
# Creates: ~/.tauri/devdock.key (add content to GitHub secret)
```

Add the **public key** to `devdock/src-tauri/tauri.conf.json` under `bundle`:
```json
"bundle": {
  "active": true,
  ...
  "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ..."
}
```

### 1.3 Enable Updater Plugin in Rust
File: `devdock/src-tauri/src/lib.rs`

Uncomment line 45 and change `UpdaterEnabled(false)` to `UpdaterEnabled(true)`:
```rust
.manage(UpdaterEnabled(true))
// line 45:
.plugin(tauri_plugin_updater::Builder::new().build())
```

### 1.4 Add Updater Endpoint to tauri.conf.json
Add this to `devdock/src-tauri/tauri.conf.json` (inside the root object):
```json
"plugins": {
  "updater": {
    "endpoints": [
      "https://github.com/mariobustosjmz/claudeDock/releases/latest/download/latest.json"
    ],
    "dialog": true
  }
}
```

### 1.5 Fix App Bundle Identifier
Current: `"identifier": "com.devdock.app"` ← ends in `.app`, conflicts with macOS bundle extension

Change to:
```json
"identifier": "io.github.mariobustosjmz.devdock"
```

File: `devdock/src-tauri/tauri.conf.json` line 5.

---

## 2. Supabase (Auth & Database)

### 2.1 Create Production Project
1. Go to **supabase.com** → New project
2. Name: `devdock-prod`
3. Region: closest to your users (US East or EU West)
4. Copy your project ref (e.g. `abcdefghijklmnop`)

### 2.2 Get Production Credentials
From project dashboard → **Settings → API**:
- `Project URL` → save as `VITE_SUPABASE_URL`
- `anon public` key → save as `VITE_SUPABASE_ANON_KEY`
- `service_role` key → save for Supabase secrets (§2.4)

Update `devdock/.env`:
```bash
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

> ⚠️ `.env` is not committed (in .gitignore). Users set their own via `.env.example`.

### 2.3 Run Database Migrations
```bash
cd /Users/mariobustosjmz/Desktop/claude/dock
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
# Verify schema:
supabase db diff
```

This creates the `subscriptions` table with RLS policies and the auto-create trigger.

### 2.4 Configure Supabase Secrets (for Edge Functions)
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 2.5 Deploy Stripe Webhook Edge Function
```bash
supabase functions deploy stripe-webhook --project-ref YOUR_PROJECT_REF
# Note the function URL: https://YOUR_REF.supabase.co/functions/v1/stripe-webhook
```

---

## 3. Stripe (Payments)

### 3.1 Create Stripe Account
Go to **dashboard.stripe.com** → Create account (or log in)

### 3.2 Create Products & Prices
In Stripe Dashboard → **Products → Add product**:

| Product | Price | Billing | Price ID to copy |
|---------|-------|---------|-----------------|
| DevDock Pro | $9/month | Recurring monthly | `price_xxx_monthly` |
| DevDock Pro | $79/year | Recurring annual | `price_xxx_annual` |

### 3.3 Create Payment Link
Dashboard → **Payment links → Create**:
- Add product: DevDock Pro (monthly or annual)
- Copy the link URL (format: `https://buy.stripe.com/xxxxx`)

Update `devdock/.env`:
```bash
VITE_STRIPE_CHECKOUT_URL=https://buy.stripe.com/YOUR_LINK
STRIPE_SECRET_KEY=sk_live_xxx
```

### 3.4 Configure Stripe Webhook
Dashboard → **Developers → Webhooks → Add endpoint**:
- Endpoint URL: `https://YOUR_REF.supabase.co/functions/v1/stripe-webhook`
- Events to listen: `checkout.session.completed`, `customer.subscription.deleted`
- Copy the **Signing secret** (`whsec_xxx`) → add to Supabase secrets (§2.4)

### 3.5 Test Payment Flow
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to https://YOUR_REF.supabase.co/functions/v1/stripe-webhook
# In separate terminal, trigger test event:
stripe trigger checkout.session.completed
```

---

## 4. Auto-Update Infrastructure

After completing §1.2–1.4 and §1.3, when CI publishes artifacts to GitHub Releases, the `latest.json` file is automatically generated by `tauri-apps/tauri-action`. This file is what the updater endpoint points to.

**How it works:**
1. User installs DevDock v0.2.0
2. On startup, `UpdateService` calls Tauri updater
3. Updater fetches `latest.json` from GitHub Releases
4. If newer version exists, `UpdateBanner` appears
5. User clicks install → app downloads and relaunches

**No additional server needed** — GitHub Releases serves `latest.json` automatically via `tauri-action`.

---

## 5. Landing Page

See full plan at `docs/plans/2026-02-20-landing-page.md`.

### Quick steps:
```bash
# 1. Scaffold site
mkdir -p /Users/mariobustosjmz/Desktop/claude/devdock-site
cd /Users/mariobustosjmz/Desktop/claude/devdock-site
npm create astro@latest . -- --template minimal --typescript strict --install
npx astro add tailwind

# 2. Create GitHub repo
gh repo create mariobustosjmz/devdock-site --public

# 3. Enable GitHub Pages
# GitHub → repo → Settings → Pages → Source: GitHub Actions

# 4. Push and deploy
git push origin main
```

**Download links** for the landing page (use after CI artifacts are published):
```
macOS (Apple Silicon): https://github.com/mariobustosjmz/claudeDock/releases/latest/download/devdock_0.2.0_aarch64.dmg
macOS (Intel): https://github.com/mariobustosjmz/claudeDock/releases/latest/download/devdock_0.2.0_x64.dmg
Windows: https://github.com/mariobustosjmz/claudeDock/releases/latest/download/devdock_0.2.0_x64-setup.exe
Linux: https://github.com/mariobustosjmz/claudeDock/releases/latest/download/devdock_0.2.0_amd64.AppImage
```

### Assets needed:
- [ ] `demo.mp4` — 30–60s screen recording of dock in use
- [ ] `favicon.svg` — DevDock icon in SVG

---

## 6. README & Legal

### 6.1 Create README.md
File: `/Users/mariobustosjmz/Desktop/claude/dock/README.md`

Minimum sections:
- What is DevDock (1 paragraph + screenshot)
- Download links (link to Releases)
- Dev setup: `pnpm install && pnpm tauri dev`
- Tech stack (Tauri v2, Angular 19, Rust)
- Contributing link

### 6.2 Create LICENSE
```bash
# MIT License (recommended for open source)
cat > /Users/mariobustosjmz/Desktop/claude/dock/LICENSE << 'EOF'
MIT License

Copyright (c) 2026 Mario Bustos

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

---

## 7. Communication & Launch

### 7.1 Internal (pre-launch)
- [ ] Test full auth flow on production Supabase (sign up → sign in → upgrade → verify Pro features)
- [ ] Test payment on Stripe test mode end-to-end
- [ ] Test auto-update: install v0.2.0, bump version, verify banner appears
- [ ] Test on macOS Intel + Apple Silicon
- [ ] Test on Windows 11
- [ ] Test on Ubuntu 22.04

### 7.2 Beta Announcement (when CI passes + Supabase live)
Channels to post:
- [ ] **Twitter/X**: Short video + download link + "floating AI dock, finally"
- [ ] **Product Hunt**: Submit as upcoming product, schedule launch day
- [ ] **Reddit**: r/SideProject, r/rust, r/angular — show architecture details
- [ ] **Hacker News**: Show HN post with technical writeup
- [ ] **Discord**: Tauri Discord, Angular Discord — share as demo

### 7.3 Launch Copy (template)
```
🚀 DevDock — floating dev dock for AI coding tools

Works on top of your IDE, never steals focus. Instant access to:
• Smart screenshots with region selection
• Prompt optimizer (Groq API)
• Voice input → transcription
• Agent monitoring (Claude Code, Cursor, Aider)
• Workspace snapshots
• Custom action buttons

Built with Tauri v2 + Angular 19 + Rust
Free tier available. Pro at $9/mo.

Download: [link]
GitHub: [link]
```

---

## 8. Execution Order

| Priority | Item | Effort | Blocking |
|----------|------|--------|---------|
| 🔴 P0 | CI passes (current run) | — | Artifacts |
| 🔴 P0 | Tauri signing key → GitHub secret | 10 min | Signed updates |
| 🔴 P0 | Fix app identifier (`.app` suffix) | 5 min | macOS signing |
| 🔴 P0 | Supabase production project + migrations | 30 min | Auth |
| 🔴 P0 | Stripe products + payment link | 20 min | Payments |
| 🔴 P0 | Deploy stripe-webhook Edge Function | 15 min | Subscriptions |
| 🔴 P0 | Enable updater plugin + endpoint in config | 15 min | Auto-update |
| 🟡 P1 | README.md + LICENSE | 20 min | GitHub presence |
| 🟡 P1 | Record demo video | 1 hr | Landing page |
| 🟡 P1 | Landing page (Astro) | 3–4 hr | Downloads |
| 🟢 P2 | Beta announcement posts | 1 hr | Growth |
| 🟢 P2 | Product Hunt submission | 30 min | Growth |

---

## 9. Post-Launch Backlog

- [ ] Unit test coverage (0 `.spec.ts` currently — target 80% services)
- [ ] Sentry error tracking integration
- [ ] PostHog analytics (installs, feature usage, conversion)
- [ ] macOS notarization (code signing certificate from Apple Developer Program — $99/yr)
- [ ] Windows code signing certificate (removes SmartScreen warning)
- [ ] CONTRIBUTING.md for open source contributors
- [ ] Fix MCP WARN: NSPanel accessibility tree size (78 bytes — plugin limitation)
- [ ] Fix MCP WARN: `ipc_execute_command` stub in tauri-plugin-mcp-bridge
