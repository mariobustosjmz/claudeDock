# DevDock Architecture

## System Architecture

```
┌──────────────────────────────────────────────────────┐
│                   DevDock Application                 │
├───────────────────────┬──────────────────────────────┤
│   Angular Frontend    │     Tauri Rust Backend        │
│   (System WebView)    │     (Native Process)          │
│                       │                               │
│  ┌─────────────────┐  │  ┌────────────────────────┐  │
│  │  Dock Shell      │  │  │  commands/              │  │
│  │  (Main Layout)   │◄─┼──┤  ├─ screenshot.rs       │  │
│  │                  │  │  │  ├─ process.rs          │  │
│  │  ┌────────────┐  │  │  │  ├─ shell.rs            │  │
│  │  │ Feature    │  │  │  │  ├─ window.rs           │  │
│  │  │ Panels     │  │  │  │  └─ audio.rs            │  │
│  │  │            │  │  │  ├────────────────────────┤  │
│  │  │ Screenshot │──┼──┼──┤  services/              │  │
│  │  │ Prompt     │  │  │  │  ├─ capture_service.rs  │  │
│  │  │ Voice      │  │  │  │  ├─ process_service.rs  │  │
│  │  │ Agents     │  │  │  │  ├─ window_service.rs   │  │
│  │  │ Preview    │  │  │  │  └─ audio_service.rs    │  │
│  │  │ Actions    │  │  │  └────────────────────────┘  │
│  │  │ Snapshots  │  │  │                               │
│  │  └────────────┘  │  │  Tauri Plugins:               │
│  └─────────────────┘  │  ├─ global-shortcut            │
│                       │  ├─ shell                       │
│                       │  ├─ store                       │
│                       │  ├─ notification                │
│                       │  ├─ autostart                   │
│                       │  └─ window-state                │
├───────────────────────┴──────────────────────────────┤
│                    External APIs                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Groq API │  │ Whisper/ │  │ Stripe (payments)  │  │
│  │ (prompts)│  │ Deepgram │  │                    │  │
│  └──────────┘  └──────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## IPC Communication Pattern

Frontend (Angular) communicates with Backend (Rust) via Tauri's IPC:

```typescript
// Frontend: invoke Tauri command
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<ScreenshotResult>('capture_screenshot', {
  region: { x: 0, y: 0, width: 800, height: 600 }
});
```

```rust
// Backend: Tauri command handler (thin controller)
#[tauri::command]
async fn capture_screenshot(region: CaptureRegion) -> Result<ScreenshotResult, AppError> {
    let service = CaptureService::new();
    service.capture(region).await
}
```

## State Management Strategy

```
Angular Signals (frontend-only state)
├── DockStateService        → dock position, visibility, size
├── ScreenshotStateService  → captured images, annotations
├── PromptStateService      → prompt history, current prompt
├── AgentStateService       → running agents, metrics
├── VoiceStateService       → recording status, transcription
├── PreviewStateService     → preview URL, CSS changes
├── SnapshotStateService    → saved/loaded snapshots
├── ActionStateService      → custom buttons config
└── SettingsService         → app preferences, API keys

Tauri Store (persistent, cross-session)
├── settings.json           → user preferences
├── actions.json            → custom button configs
├── snapshots.json          → workspace snapshot data
├── prompt-history.json     → saved prompts
└── api-keys.enc            → encrypted API credentials
```

## Feature Module Pattern

Each feature follows this structure:
```
features/screenshot/
├── screenshot.component.ts     # Standalone component (thin, OnPush)
├── screenshot.service.ts       # Business logic, Tauri IPC calls
├── screenshot.state.ts         # Signals-based state
├── models/
│   ├── screenshot.model.ts     # Interfaces & types
│   └── annotation.model.ts
├── components/                 # Child components if needed
│   ├── region-selector.component.ts
│   └── annotation-overlay.component.ts
└── screenshot.routes.ts        # Lazy-loaded route config
```

## Window Configuration

DevDock uses multiple Tauri windows:
1. **Main Dock** — Frameless, transparent, always-on-top, resizable strip
2. **Preview Window** — Secondary window with WebView for localhost preview
3. **Settings** — Standard window for configuration
4. **Screenshot Overlay** — Fullscreen transparent window for region selection

## Security Model (Tauri v2 Capabilities)

Capabilities are declared per-window. The main dock window gets:
- `core:default` — Base Tauri APIs
- `shell:allow-execute` — Run user-configured commands
- `global-shortcut:allow-register` — Register hotkeys
- `store:default` — Persistent storage
- `notification:default` — System notifications

Screenshot overlay window gets minimal permissions:
- `core:default` only
