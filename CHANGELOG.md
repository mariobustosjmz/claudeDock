# Changelog

## v0.2.0-beta (2026-02-20)

### Features
- **Auth system** — Supabase email/password login, session persistence, tier management (Free/Pro)
- **Stripe payments** — Subscription checkout, Pro feature gating, webhook handler via Supabase Edge Function
- **Auto-update** — `tauri-plugin-updater` integration; `UpdateBanner` component with one-click install
- **Agent Session Manager (F5)** — Live detection of Claude Code, Cursor, Aider, Codex via `sysinfo`; CPU/memory metrics; token/cost parsing from agent logs
- **Preview Window (F6)** — Secondary Tauri WebView; CSS inspector and live editing; prompt generation from CSS changes
- **Workspace Snapshots (F7)** — AppleScript window enumeration on macOS; save/restore named snapshots; Pro-gated restore
- **Educational Shorts (F9)** — Curated tips catalog; agent-aware suggestions; category filtering
- **tauri-plugin-mcp-bridge** — AI agent native window testing via WebSocket on port 9223; supports all 17 MCP tools
- **`withGlobalTauri: true`** — Exposes `window.__TAURI__` globally; unblocks `webview_execute_js`, `ipc_monitor`, `webview_get_styles`

### Fixes
- NSPanel focus handling and AppleScript input sanitization
- Tray icon reliability on macOS
- Supabase null token columns causing auth login failure
- Windows `EnumWindows` race condition
- Microphone permission error propagation
- Updater error type and install state caching

### Infrastructure
- GitHub Actions release workflow — cross-platform builds (macOS arm64/x64, Windows, Linux)
- Tauri release profile optimizations (LTO, opt-level=3, strip symbols)
- Deferred heavy panel loading for faster startup

### Code Quality
- All inline interfaces extracted to dedicated `models/` files
- Rust service helpers extracted from command handlers (`context_service.rs`, `process_service.rs`)
- `UpdateInfo` missing `serde::Deserialize` fixed
- MCP smoke test: **35 PASS / 0 FAIL / 2 WARN** across all 17 bridge tools

---

## v0.1.0 (2026-02-10)

### Features
- **Floating Dock Shell (F1)** — Frameless, transparent, always-on-top NSPanel; drag-to-reposition; auto-hide
- **Smart Screenshot (F2)** — Region selection overlay; `screenshots` crate capture; annotated image to clipboard
- **Prompt Optimizer (F3)** — Groq API integration; project context detection (git, package.json); prompt history
- **Voice Input (F4)** — `cpal` audio recording; Whisper transcription; voice-to-prompt pipeline
- **Custom Action Buttons (F8)** — Shell command execution; configurable hotkeys; persistent config
- **Prompt History (F10)** — Searchable history with metadata; one-click replay
- Tray icon with context menu
- Settings panel
- Tauri Store for persistent preferences
- TailwindCSS 4 dark theme with CSS variables
