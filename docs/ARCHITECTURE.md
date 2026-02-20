# DevDock Architecture

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      DevDock Application                      │
├─────────────────────────┬────────────────────────────────────┤
│    Angular Frontend      │       Tauri Rust Backend           │
│    (System WebView)      │       (Native Process)             │
│                          │                                    │
│  ┌──────────────────┐   │  ┌─────────────────────────────┐  │
│  │  DockShellComponent│  │  │  commands/                   │  │
│  │  (Main Layout)    │◄─┼──┤  ├─ screenshot.rs             │  │
│  │                   │  │  │  ├─ process.rs                │  │
│  │  Feature Panels:  │  │  │  ├─ shell.rs                  │  │
│  │  ├─ Screenshot    │  │  │  ├─ audio.rs                  │  │
│  │  ├─ Prompt        │  │  │  ├─ context.rs                │  │
│  │  ├─ Voice         │  │  │  ├─ preview.rs                │  │
│  │  ├─ Agents        │  │  │  ├─ snapshot.rs               │  │
│  │  ├─ Preview       │  │  │  └─ update.rs                 │  │
│  │  ├─ Actions       │  │  ├─────────────────────────────  │  │
│  │  ├─ Snapshots     │  │  │  services/                    │  │
│  │  ├─ Shorts        │  │  │  ├─ context_service.rs        │  │
│  │  ├─ Settings      │  │  │  ├─ process_service.rs        │  │
│  │  └─ Account/Auth  │  │  │  └─ window_service.rs         │  │
│  └──────────────────┘   │  └─────────────────────────────  │  │
│                          │                                    │
│  core/services/          │  Tauri Plugins (v2):              │
│  ├─ AuthService          │  ├─ tauri-plugin-mcp-bridge       │
│  ├─ UpdateService        │  ├─ tauri-plugin-global-shortcut  │
│  └─ PermissionsService   │  ├─ tauri-plugin-shell            │
│                          │  ├─ tauri-plugin-store            │
│                          │  ├─ tauri-plugin-updater          │
│                          │  ├─ tauri-plugin-notification     │
│                          │  ├─ tauri-plugin-autostart        │
│                          │  ├─ tauri-nspanel                 │
│                          │  └─ tauri-plugin-prevent-default  │
├─────────────────────────┴────────────────────────────────────┤
│                       External Services                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Groq API │  │ Whisper  │  │ Supabase │  │   Stripe    │ │
│  │ (prompts)│  │ (STT)    │  │ (auth/db)│  │ (payments)  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## IPC Communication Pattern

Frontend (Angular) communicates with Backend (Rust) via Tauri's IPC:

```typescript
// Frontend: invoke Tauri command
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<AgentProcess[]>('get_running_agents');
```

```rust
// Backend: thin command handler calling service
#[tauri::command]
async fn get_running_agents() -> Result<Vec<AgentProcess>, String> {
    process_service::scan_agents()
}
```

## State Management Strategy

```
Angular Signals (frontend-only reactive state)
├── DockShellComponent    → active panel, dock position/visibility
├── ScreenshotService     → captured images, overlay state
├── PromptService         → current prompt, history, Groq responses
├── VoiceService          → recording state, transcription, mic device
├── AgentsService         → running agents, metrics polling
├── PreviewService        → preview URL, CSS inspector state
├── SnapshotsService      → saved snapshots, restore state
├── ShortsService         → catalog, active short, category filter
├── AuthService           → session, user tier (Free/Pro)
└── UpdateService         → updater state, install progress

Tauri Store (persistent, cross-session JSON)
├── settings              → user preferences, API keys
├── actions               → custom button configs
├── snapshots             → workspace snapshot data
└── prompt-history        → saved prompts with metadata

Supabase (remote, auth + subscription state)
├── auth.users            → email/password auth
└── public.subscribers    → Stripe subscription tier
```

## Window Configuration

| Window | Type | Config |
|--------|------|--------|
| `main` | NSPanel (macOS) | Frameless, transparent, always-on-top, non-activating |
| `screenshot-overlay` | Fullscreen transparent | Captures region selection input |
| Preview window | Standard WebView | Opens localhost:PORT for CSS inspection |

**macOS NSPanel**: Uses `tauri-nspanel` with `NSNonactivatingPanelMask` so the dock never steals focus from the user's editor.

**`withGlobalTauri: true`**: Set in `tauri.conf.json` to expose `window.__TAURI__` globally — required for `tauri-plugin-mcp-bridge` JS execution.

## Security Model (Tauri v2 Capabilities)

```
capabilities/
├── default.json          → main window permissions
│   ├── core:default
│   ├── shell:allow-execute
│   ├── global-shortcut:allow-register
│   ├── store:default
│   ├── notification:default
│   ├── macos-permissions:allow-*
│   └── mcp-bridge:default
└── screenshot-overlay.json → overlay window (minimal)
    └── core:default
```

## MCP Testing Integration

`tauri-plugin-mcp-bridge` exposes a WebSocket server on port 9223 for AI agent automation:

```
AI Agent (Claude Code, etc.)
    ↓ MCP stdio JSON-RPC
mcp-server-tauri (Node.js binary)
    ↓ WebSocket on port 9223
tauri-plugin-mcp-bridge (Rust plugin)
    ↓ Tauri IPC
DevDock Webview / Rust Backend
```

**Smoke test baseline (2026-02-20):** 35 PASS / 0 FAIL / 2 WARN across all 17 tools.
See `docs/mcp-smoke-test-report-2026-02-20.md` for full results.

## Feature Module Pattern

Each feature follows this exact structure:

```
features/[feature]/
├── [feature].component.ts      # Standalone, OnPush, inject() DI, @if/@for templates
├── [feature].service.ts        # All business logic, Tauri invoke calls, Signals state
└── models/
    └── [feature].model.ts      # Interfaces & types only — no logic
```

Child components only when there are 2+ reusable sub-views (e.g. `screenshot-overlay.component.ts`).

## Auth & Subscription Flow

```
User opens Account panel
    → AuthService.signIn(email, password) → Supabase Auth
    → Session stored in Tauri Store
    → AuthService.refreshSubscription() → reads public.subscribers
    → PermissionsService.canAccess(feature) → checks tier
    → Pro features: Voice (full), Snapshot restore, Preview CSS editing
```
