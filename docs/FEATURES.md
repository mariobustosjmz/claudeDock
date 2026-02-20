# DevDock Features Specification

> **Status**: All features through Phase 4 are implemented and shipped in v0.2.0-beta.

---

## F1: Floating Dock Shell ✅
**Priority**: P0 | **Phase**: 1 | **Status**: Shipped

Frameless, transparent, always-on-top panel using macOS `NSPanel` (`tauri-nspanel`) so the dock never steals focus from the user's editor. Contains icon buttons for each feature. Clicking expands a panel. Draggable, auto-hide configurable.

**Tauri config**: `decorations: false`, `transparent: true`, `alwaysOnTop: true`, `withGlobalTauri: true`
**Key component**: `DockShellComponent` — manages panel switching, button strip, layout
**State**: Signals in `DockShellComponent` — active panel, position

---

## F2: Smart Screenshot ✅
**Priority**: P0 | **Phase**: 2 | **Status**: Shipped

1. User clicks screenshot button or global hotkey
2. Fullscreen transparent overlay appears (`screenshot-overlay` window)
3. User draws rectangle to select region
4. Rust captures that region via `screenshots` crate
5. Annotated image copies to clipboard

**Rust**: `capture_screenshot`, `capture_region`, `get_screen_info` in `screenshot.rs`
**Angular**: `ScreenshotService`, `ScreenshotComponent`, `ScreenshotOverlayComponent`
**Models**: `ScreenshotResult`, `CaptureRegion` in `models/screenshot.model.ts`

---

## F3: Prompt Optimizer ✅
**Priority**: P0 | **Phase**: 2 | **Status**: Shipped

1. User types rough prompt
2. System detects active project context (git root, `package.json`, recent commits)
3. Sends to Groq API (`llama-3.3-70b-versatile`) with context-aware system prompt
4. Returns structured prompt with context, file path, action, expected behavior
5. One-click copy to clipboard; auto-saved to prompt history

**Rust**: `get_project_context` in `context.rs` using `context_service.rs` helpers (git, package.json)
**Angular**: `PromptService`, `PromptComponent`, `PromptHistoryService`
**Models**: `OptimizedPrompt`, `PromptHistory`, `ProjectContext` in `models/prompt.model.ts`

---

## F4: Voice Input ✅
**Priority**: P1 | **Phase**: 2 | **Status**: Shipped

1. User presses record button or global hotkey
2. Audio recording via `cpal` crate (WAV format, `hound` encoding)
3. On stop, WAV file sent to Whisper API for transcription
4. Transcript displayed; one-click forward to Prompt Optimizer

**Rust**: `start_recording`, `stop_recording`, `get_audio_devices` in `audio.rs`
**Angular**: `VoiceService`, `VoiceComponent`
**Models**: `VoiceState`, `AudioDevice` in `models/voice.model.ts`
**Pro feature**: Full voice-to-prompt pipeline (Free tier: record only)

---

## F5: Agent Session Manager ✅
**Priority**: P1 | **Phase**: 3 | **Status**: Shipped

1. Rust polls running processes every 2s via `sysinfo` crate
2. Detects: Claude Code, Cursor Agent, Aider, Codex by process name + args
3. Reads agent log files for token/cost metrics (structured + heuristic parsing)
4. Frontend shows live dashboard — per-agent cards with status, CPU/memory, tokens, cost

**Rust**: `get_running_agents`, `get_agent_metrics` in `process.rs` + `process_service.rs`
**Angular**: `AgentsService`, `AgentsComponent`
**Models**: `AgentProcess`, `AgentMetrics` in `models/agent.model.ts`

---

## F6: Preview Window ✅
**Priority**: P1 | **Phase**: 3 | **Status**: Shipped

1. Opens secondary Tauri WebView pointing to localhost:PORT
2. CSS inspector: click elements to see computed styles
3. Live CSS editing with immediate visual feedback
4. "Add to Prompt" generates natural language description of changes

**Rust**: `open_preview_window`, `close_preview_window`, `inject_inspector`, `apply_css_change` in `preview.rs`
**Angular**: `PreviewService`, `PreviewComponent`
**Models**: `CssChange`, `PreviewState` in `models/preview.model.ts`
**Pro feature**: CSS editing (Free: view only)

---

## F7: Workspace Snapshots ✅
**Priority**: P1 | **Phase**: 3 | **Status**: Shipped

1. "Save Snapshot" captures all open windows (app, position, size) via AppleScript
2. Saves named snapshot to Tauri Store (JSON)
3. "Restore Snapshot" relaunches apps and repositions windows via AppleScript

**Rust**: `get_open_windows`, `save_snapshot`, `restore_snapshot` in `snapshot.rs`
**Angular**: `SnapshotsService`, `SnapshotsComponent`
**Models**: `WorkspaceSnapshot`, `WindowEntry` in `models/snapshot.model.ts`
**Note**: AppleScript inputs sanitized against injection. Cross-platform: Windows Win32, Linux wmctrl.
**Pro feature**: Restore snapshots (Free: save only)

---

## F8: Custom Action Buttons ✅
**Priority**: P0 | **Phase**: 1 | **Status**: Shipped

1. User configures buttons in Settings: name, icon (emoji), shell command, hotkey
2. Buttons appear in dock strip
3. Click or hotkey triggers `tauri-plugin-shell` command execution

**Rust**: `execute_action` in `shell.rs`
**Angular**: `ActionsService`, `ActionsComponent`
**Storage**: `tauri-plugin-store` (actions.json)
**Shortcuts**: `tauri-plugin-global-shortcut`

---

## F9: Educational Shorts ✅
**Priority**: P2 | **Phase**: 3 | **Status**: Shipped

1. Curated tips catalog (8 entries: Angular Signals, Tauri IPC, Rust patterns, etc.)
2. Category filtering (Angular, Tauri, Rust, General)
3. Agent-aware suggestions — highlights relevant tips based on detected running agents

**Angular**: `ShortsService`, `ShortsComponent`, `shorts-catalog.ts`
**Models**: `Short`, `ShortCategory` in `models/short.model.ts`; `CategoryFilter` in `models/category-filter.model.ts`

---

## F10: Prompt History ✅
**Priority**: P1 | **Phase**: 2 | **Status**: Shipped

1. Every optimized prompt auto-saved with timestamp, project name, tags
2. Searchable list with full-text filter via Angular Signals computed
3. One-click replay (re-copy to clipboard)

**Angular**: `PromptHistoryService`, integrated in `PromptComponent`
**Models**: `PromptHistory` in `models/prompt-history.model.ts`
**Storage**: `tauri-plugin-store` (prompt-history.json)

---

## Auth & Payments ✅
**Priority**: P0 | **Phase**: 4 | **Status**: Shipped

- **Supabase Auth**: Email/password login, session persistence, automatic refresh
- **Stripe**: Subscription checkout via Stripe-hosted page; webhook (`stripe-webhook` Supabase Edge Function) updates `public.subscribers` table
- **Feature gating**: `PermissionsService` checks tier on Pro features (Voice full pipeline, Snapshot restore, Preview CSS editing)
- **UI**: `AuthComponent` (login/signup), `UpgradePromptComponent` (inline Pro nudge)

---

## Auto-Update ✅
**Priority**: P1 | **Phase**: 4 | **Status**: Shipped

- `tauri-plugin-updater` checks configured update endpoint on startup
- `UpdateService` exposes update state as Signal
- `UpdateBannerComponent` shows non-intrusive banner when update available
- One-click install + relaunch

---

## MCP Bridge (AI Agent Testing) ✅
**Priority**: P0 | **Phase**: 4 | **Status**: Shipped

- `tauri-plugin-mcp-bridge` v0.8.3 exposes WebSocket on port 9223
- Enables AI agents (Claude Code) to automate and inspect the running app
- All 17 MCP tools tested: window management, DOM snapshot, screenshots, IPC monitoring, event emission, backend state, console logs
- **Smoke test baseline**: 35 PASS / 0 FAIL / 2 WARN
- `withGlobalTauri: true` required — exposes `window.__TAURI__` for bridge JS execution

See `docs/mcp-smoke-test-report-2026-02-20.md` for full test results.

---

## Deferred Features

| Feature | Reason |
|---------|--------|
| F7 element detection (numbered badges) | Replaced with simpler region capture without AI detection |
| Landing page / docs site | Out of scope for dev phase — deferred post-beta |
| Codex approval/deny via stdin | Agent IPC write not implemented (read-only monitoring) |
