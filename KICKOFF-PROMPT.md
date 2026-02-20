# DevDock — Claude Code Master Prompt

## How to Use This File

This file contains the master kickoff prompt and phase-specific prompts for building DevDock with Claude Code. Copy each prompt into Claude Code when you're ready to execute that phase.

**Before starting**: Place the following files in your project root:
- `CLAUDE.md` (from this package)
- `docs/ARCHITECTURE.md`
- `docs/FEATURES.md`
- `docs/PLAN.md`
- `.claude/commands/new-feature.md`
- `.claude/commands/add-tauri-command.md`
- `.claude/commands/review.md`

---

## 🚀 KICKOFF PROMPT — Project Initialization + Phase 1

Copy everything below the line into Claude Code:

---

I'm building DevDock, a floating developer dock for AI coding workflows. Read CLAUDE.md, docs/ARCHITECTURE.md, docs/FEATURES.md, and docs/PLAN.md to understand the full project.

**Your task: Complete Phase 1 (Foundation) from docs/PLAN.md.**

Start in Plan Mode first. Create a detailed execution plan for Phase 1 and write it to `docs/phase1-execution.md`. Include:
1. Exact commands to initialize the Tauri v2 + Angular 19 project with pnpm
2. File-by-file creation order
3. Dependencies to install (npm and cargo)
4. Which Tauri plugins are needed for Phase 1
5. How you'll structure the dock shell component

After I approve the plan, execute it step by step:

### Step 1: Project Initialization
- Initialize a Tauri v2 project using `pnpm create tauri-app` with Angular as frontend
- Configure Angular 19 with standalone components, strict TypeScript, zoneless if stable
- Set up TailwindCSS 4 with PostCSS
- Create the full directory structure from ARCHITECTURE.md
- Configure `tauri.conf.json` for the main dock window:
  - `decorations: false` (frameless)
  - `transparent: true`
  - `alwaysOnTop: true`
  - Initial size: 400x60 (horizontal dock strip)
  - `resizable: true`
  - Title: "DevDock"

### Step 2: Core Services & Models
Create the foundational services and types:
- `src/app/core/models/dock.model.ts` — DockPosition, DockSize, DockConfig, PanelType enum
- `src/app/core/models/action-button.model.ts` — ActionButton, ActionType, ShortcutConfig
- `src/app/core/services/dock-state.service.ts` — Signals-based dock state management
- `src/app/core/services/tauri-bridge.service.ts` — Centralized Tauri invoke wrapper with error handling
- `src/app/core/services/storage.service.ts` — Wrapper for tauri-plugin-store
- `src/app/core/services/shortcut.service.ts` — Global keyboard shortcut management

### Step 3: Dock Shell Component
- `src/app/features/dock/dock-shell.component.ts` — Main dock layout
  - Horizontal button strip with icon buttons for each feature
  - Expandable panel area below the strip
  - Drag handle for repositioning
  - Uses DockStateService for all state
  - TailwindCSS styling: dark glassmorphism theme, rounded corners, subtle shadow
  - Panel switching via Signals (activePanel signal)
- `src/app/features/dock/components/dock-button.component.ts` — Individual dock button (icon + tooltip)
- `src/app/features/dock/components/dock-panel.component.ts` — Panel container with slide animation

### Step 4: Dock Window Behavior (Rust)
- `src-tauri/src/commands/window.rs`:
  - `set_dock_position(x, y)` — Move dock window
  - `get_dock_position()` — Get current position
  - `toggle_dock_visibility()` — Show/hide
  - `set_always_on_top(enabled)` — Toggle always-on-top
- Implement drag & drop in Angular using mouse events + Tauri window position commands
- Implement auto-hide: detect cursor proximity via pointer events, fade dock with CSS transitions

### Step 5: Custom Action Buttons (Feature F8)
- `src/app/features/actions/` — Full feature module following the pattern
- Settings UI where user configures buttons:
  - Button name, icon (from Lucide icon set), action type dropdown
  - For shell commands: text input for the command
  - For app launch: file picker for the executable
  - For URL: URL input
  - Keyboard shortcut recorder
- Execution logic:
  - Shell: invoke Tauri shell plugin
  - App: invoke Tauri shell `open` command
  - URL: invoke Tauri shell `open` command
- Display buttons in the dock strip
- Register global shortcuts via tauri-plugin-global-shortcut

### Step 6: Tray Icon
- Configure system tray in `tauri.conf.json`
- Menu items: Show/Hide Dock, Settings, Separator, Quit
- Tray icon: simple monochrome icon (create a basic SVG)

### Step 7: Settings Panel
- `src/app/features/settings/` — Feature module
- Basic settings:
  - Dock position (top, bottom, left, right, floating)
  - Auto-hide toggle + delay slider
  - Launch at login toggle (tauri-plugin-autostart)
  - Theme (dark/light — default dark)
  - API Keys section (Groq, Whisper) — stored encrypted via tauri-plugin-store
- All settings persist via StorageService

### Step 8: App Routing & Bootstrapping
- `src/app/app.routes.ts` — Lazy routes for each feature panel
- `src/app/app.component.ts` — Root component that renders DockShellComponent
- Ensure the app bootstraps correctly in Tauri's WebView

After completing each step, run:
- `pnpm lint` to verify TypeScript
- `cargo clippy --manifest-path src-tauri/Cargo.toml` to verify Rust
- `pnpm tauri dev` to verify it runs

Update docs/PLAN.md checkboxes as you complete each item.

---

## 🎯 PHASE 2 PROMPT — Core AI Features

Copy this into Claude Code after Phase 1 is complete:

---

Read CLAUDE.md and docs/PLAN.md. Phase 1 is complete. Now execute Phase 2: Core AI Features.

Start in Plan Mode. Review the current codebase, then create `docs/phase2-execution.md` with the detailed plan. After approval, implement:

### Task 2.1: Smart Screenshot (Feature F2)

Read docs/FEATURES.md section F2 for full spec.

**Rust side:**
- Add `screenshots` crate to Cargo.toml (or use platform-specific screen capture)
- `src-tauri/src/commands/screenshot.rs`:
  - `start_region_selection()` — Opens fullscreen transparent overlay window
  - `capture_region(x, y, width, height)` — Captures screen pixels in that region
  - `get_accessibility_elements(region)` — Attempts to get UI elements via accessibility API
- Return captured image as base64 + detected element metadata

**Angular side:**
- `src/app/features/screenshot/` — Full feature module
- Region selector component: fullscreen overlay with crosshair, rubber-band rectangle
- Annotation overlay: render numbered badges on detected elements
- Copy to clipboard: annotated image + element metadata as structured text
- Panel UI: thumbnail gallery of recent screenshots, click to re-copy

### Task 2.2: Prompt Optimizer (Feature F3)

Read docs/FEATURES.md section F3.

**Angular side:**
- `src/app/features/prompt/` — Full feature module
- `prompt.service.ts`:
  - Groq API integration (REST call to api.groq.com/openai/v1/chat/completions)
  - System prompt that instructs Groq to structure output as: Context, File, Action, Expected
  - Inject project context: detect git root, read package.json name/dependencies
- `prompt.component.ts`: Input textarea, "Optimize" button, structured output display
- Result card shows: Context, File path, Action, Expected behavior
- One-click copy button for the full structured prompt
- Response time indicator (target <200ms)

**Rust side:**
- `src-tauri/src/commands/context.rs`:
  - `get_project_context()` — Returns git root path, package.json info, recent git changes
  - Reads file system to provide context to the prompt optimizer

### Task 2.3: Voice Input (Feature F4)

Read docs/FEATURES.md section F4.

**Rust side:**
- Add `cpal` crate for audio capture
- `src-tauri/src/commands/audio.rs`:
  - `start_recording()` — Begin capturing microphone audio
  - `stop_recording()` — Stop and return audio buffer
- Audio saved as WAV or raw PCM for API submission

**Angular side:**
- `src/app/features/voice/` — Full feature module
- `voice.service.ts`:
  - Manages recording state via Tauri commands
  - Sends audio to Whisper API (or Deepgram) for transcription
  - Streams transcription results back
- UI: Large record button (red pulse animation while recording), live transcription text area
- "Send to Prompt" button that passes transcription to the prompt optimizer
- Global hotkey for start/stop recording

### Task 2.4: Prompt History (Feature F10)

- `src/app/features/prompt/services/prompt-history.service.ts`
- Save every optimized prompt with: timestamp, original input, structured output, project name, tags
- Storage: tauri-plugin-store in `prompt-history.json`
- Search: filter by text content, project, date range
- UI: scrollable list in prompt panel, each entry expandable, copy button per entry

After each task, run linting and verify the app runs. Update PLAN.md checkboxes.

---

## 🔧 PHASE 3 PROMPT — Advanced Features

---

Read CLAUDE.md and docs/PLAN.md. Phase 2 is complete. Execute Phase 3: Advanced Features.

Start in Plan Mode. Create `docs/phase3-execution.md`. After approval:

### Task 3.1: Agent Session Manager (F5)

Read docs/FEATURES.md section F5.

**Rust side (critical):**
- Add `sysinfo` crate
- `src-tauri/src/commands/process.rs`:
  - `get_running_agents()` — Poll system processes, detect by name/args:
    - Claude Code: node processes containing "claude" in args
    - Cursor: process name "Cursor" with agent-related args
    - Codex: node processes containing "codex"
  - Return: process name, PID, command, working directory, uptime
  - `get_agent_metrics(pid)` — Read agent log files for token/cost data
- Polling: Frontend calls every 2-5 seconds via setInterval with Tauri invoke

**Angular side:**
- `src/app/features/agents/` — Full feature module
- Agent card component: shows agent name, project, status badge, token counts, cost
- Total summary bar: aggregate cost, active count, context usage
- Action buttons per agent: approve, deny, stop (where supported)

### Task 3.2: Preview Window (F6)

**Tauri:**
- Configure secondary window in tauri.conf.json for preview
- Or create window dynamically via Tauri window API
- Window loads user-specified localhost URL

**Angular:**
- `src/app/features/preview/` — Full feature module
- URL input bar (default: localhost:3000)
- Inject JavaScript into WebView for element inspection:
  - Click handler that captures clicked element's CSS
  - Highlight element with outline
  - Read computed styles
- CSS editor panel: property name, current value, editable input
- "Add to Prompt" button: generates natural language description of CSS changes
- Hot-reload: watch for file changes and auto-refresh preview

### Task 3.3: Workspace Snapshots (F7)

**Rust:**
- `src-tauri/src/commands/window.rs` (extend):
  - `get_open_windows()` — List all visible windows: app name, title, position, size
  - Platform-specific: macOS use `NSWorkspace` + AppleScript, Linux use `wmctrl`, Windows use Win32 API
  - `open_application(app_path)` — Launch an application
  - `position_window(app_name, x, y, width, height)` — Move/resize a window
- `save_snapshot(name)` — Serialize current window state + cwd
- `restore_snapshot(name)` — Open apps and position windows

**Angular:**
- `src/app/features/snapshots/` — Full feature module
- Save button: captures and names current state
- Snapshot list: named entries with timestamp
- Restore button: confirms then restores
- Delete and rename options

### Task 3.4: Educational Shorts (F9)

- Simple video player component
- Content: initially 5-10 bundled short clips (placeholder/sample videos)
- Auto-trigger when Agent Session Manager detects an agent in "generating" state
- Categorization tags and carousel navigation

Update PLAN.md after each task.

---

## 🚢 PHASE 4 PROMPT — Polish & Launch

---

Read CLAUDE.md and docs/PLAN.md. Phase 3 is complete. Execute Phase 4: Polish & Launch.

Plan Mode first → `docs/phase4-execution.md`. Then:

### Task 4.1-4.2: Auth & Payments
- Simple auth: email/password with JWT (backend can be Supabase or custom)
- Stripe integration: checkout session for Pro plan ($4/mo annual, $5.33/mo monthly)
- License validation: check subscription status on app launch
- Grace period for offline usage

### Task 4.3: Auto-Update
- Add `tauri-plugin-updater`
- Configure update endpoint (GitHub Releases or custom server)
- Check for updates on launch, notify user, download and install

### Task 4.4-4.5: Cross-Platform Testing
- Test on macOS 12+, Windows 10+, Ubuntu 22.04+
- Fix platform-specific issues:
  - Window transparency differences
  - Keyboard shortcut conflicts
  - Tray icon rendering
  - Screen capture API differences
- Document platform-specific workarounds

### Task 4.6: Performance Optimization
- Profile startup time — target <500ms
- Profile memory usage — target <80MB idle
- Lazy load all feature modules
- Optimize Rust binary size with `[profile.release]` settings
- Tree-shake unused Angular code

### Task 4.7-4.9: Distribution
- Build artifacts: .dmg (macOS), .msi/.exe (Windows), .AppImage (Linux)
- Code signing for macOS (Apple Developer Certificate)
- Create landing page (separate project or docs site)
- Beta release checklist:
  - [ ] All features functional
  - [ ] No critical bugs
  - [ ] Auto-update works
  - [ ] Payment flow works
  - [ ] Performance targets met

---

## 💡 UTILITY PROMPTS

### When starting a new session:
```
Read CLAUDE.md and docs/PLAN.md. Check current status. What's the next unchecked task? Start working on it.
```

### When something is broken:
```
The app has an issue: [describe problem]. Read the relevant feature files in docs/FEATURES.md. Diagnose the issue by examining the codebase, then fix it. Run tests after fixing.
```

### When adding a new Tauri command:
```
/add-tauri-command [describe what the command should do]
```

### When creating a new feature:
```
/new-feature [feature name and description]
```

### When reviewing code quality:
```
/review
```

### End of session:
```
Before we stop: update docs/PLAN.md with current progress. Mark completed items. Note any blockers or issues discovered. Commit all changes with a descriptive message.
```

---

## 🎛️ CLAUDE CODE CONFIGURATION TIPS

### Recommended Permission Mode
Use **AcceptEdits** mode during active development for faster iteration. Switch to **Default** mode when working on Rust/security code.

### Context Management
- Use `/clear` between different features to prevent context bleed
- After completing a major feature, start a fresh session
- Always have Claude read CLAUDE.md + PLAN.md at session start

### Parallel Agents (for complex phases)
For Phase 2-3, you can spawn sub-agents:
```
Use a sub-agent to implement the Rust commands for screenshot capture while you work on the Angular frontend components.
```

### Git Safety Net
Always work on feature branches:
```
Create branch feat/screenshot and implement the Smart Screenshot feature there. Commit incrementally.
```
