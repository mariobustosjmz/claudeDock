# DevDock Features Specification

## F1: Floating Dock Shell
**Priority**: P0 (Foundation)
**Phase**: 1

The main dock is a frameless, transparent, always-on-top window strip. It contains icon buttons for each feature. Clicking a button expands a panel below/beside the dock. The dock is draggable to any screen edge. Auto-hide when cursor moves away (configurable). Dock position and size persist across restarts.

**Tauri config**: `decorations: false`, `transparent: true`, `alwaysOnTop: true`
**Key Angular component**: `DockShellComponent` — manages layout, button strip, panel switching.
**State**: `dock-state.service.ts` — position, active panel, visibility, size.

---

## F2: Smart Screenshot
**Priority**: P0 (Core)
**Phase**: 2

1. User clicks screenshot button or presses global hotkey
2. Fullscreen transparent overlay appears with crosshair cursor
3. User draws rectangle to select region
4. System captures that screen region via OS API
5. Image is analyzed: detect interactive elements (buttons, inputs, links) by visual patterns or accessibility tree
6. Each element gets a numbered badge overlay
7. Annotated image copies to clipboard
8. Numbered reference allows AI tools to understand "element #3"

**Rust**: `capture_screenshot` command using `screenshots` crate or platform-specific API.
**Detection strategy**: Use contrast/edge detection for UI elements, or accessibility API for more accuracy.
**Output**: PNG with overlay annotations + JSON metadata of element positions.

---

## F3: Prompt Optimizer
**Priority**: P0 (Core)
**Phase**: 2

1. User types rough prompt like "fix the sidebar"
2. System detects active project context (cwd, open files from editor)
3. Sends to Groq API with system prompt that structures the output
4. Returns structured prompt: Context, File path, Action, Expected behavior
5. Result displayed in panel, one-click copy to clipboard

**API**: Groq SDK with `llama-3.3-70b-versatile` model. Target <200ms response.
**Context injection**: Read `.git` root, `package.json`, recent files from file watcher.
**Angular service**: `PromptService` handles API call, history, templates.

---

## F4: Voice Input
**Priority**: P1
**Phase**: 2

1. User presses record button or global hotkey
2. Audio recording starts via OS microphone API
3. Real-time transcription appears in the panel
4. On stop, clean text is available for copy or direct send to prompt optimizer

**Options**: OpenAI Whisper API, Deepgram API, or local whisper.cpp via Rust.
**Rust**: `start_recording` / `stop_recording` commands using `cpal` crate for audio capture.
**Angular**: `VoiceService` manages recording state, transcription stream.

---

## F5: Agent Session Manager
**Priority**: P1
**Phase**: 3

1. Rust backend polls running processes matching known agent patterns
2. Detects: Claude Code (node processes with claude), Cursor agent, Codex
3. For each agent: reads stdout/log files for metrics (tokens, cost, status)
4. Frontend displays live dashboard with per-agent cards
5. Approve/deny actions via IPC to agent's stdin or API

**Detection**: `sysinfo` crate to enumerate processes. Match by process name and command args.
**Metrics**: Parse agent log files or intercept API calls for token/cost data.
**Polling interval**: Every 2 seconds for process list, every 5 seconds for metrics.

---

## F6: Preview Window
**Priority**: P1
**Phase**: 3

1. Opens secondary Tauri window with WebView pointing to localhost:PORT
2. User clicks "Inspect" to enable click-to-select mode
3. Clicking an element shows CSS properties panel
4. User edits CSS values with visual controls (color picker, sliders)
5. "Add to Prompt" generates a description of changes for AI agent

**Implementation**: Second Tauri window with `url: "http://localhost:PORT"`.
**CSS editing**: Inject JavaScript into WebView to intercept clicks and read/modify styles.
**Prompt generation**: Template that describes CSS changes in natural language.

---

## F7: Workspace Snapshots
**Priority**: P1
**Phase**: 3

1. User clicks "Save Snapshot" from dock
2. System captures: list of open windows (app name, position, size), active project path, terminal sessions
3. Saves as named snapshot in persistent store
4. "Restore Snapshot" opens all apps and positions windows

**Rust**: Use accessibility APIs or `wmctrl`-equivalent to enumerate windows.
**macOS**: `NSWorkspace` for running apps, AppleScript for window positions.
**Storage**: JSON in Tauri store plugin.

---

## F8: Custom Action Buttons
**Priority**: P0 (Foundation)
**Phase**: 1

1. User configures buttons in settings: name, icon, action type
2. Action types: open app, run shell command, open URL, run script
3. Each button can have a global keyboard shortcut
4. Buttons appear in the dock strip

**Implementation**: Configuration stored in `tauri-plugin-store`.
**Shell execution**: `tauri-plugin-shell` with user-defined commands.
**Shortcuts**: `tauri-plugin-global-shortcut` for hotkey registration.

---

## F9: Educational Shorts
**Priority**: P2
**Phase**: 3

1. Curated short video/GIF tips (15-60 seconds)
2. Auto-play during AI agent idle/thinking time
3. Topics: CSS tricks, Git tips, React patterns, etc.
4. Categorized by tech stack

**Implementation**: Embedded video player in Angular using `<video>` element.
**Content**: Initially bundled assets, later fetched from CDN.
**Trigger**: Detect when AI agent is generating (processing state in Agent Manager).

---

## F10: Prompt History
**Priority**: P1
**Phase**: 2

1. Every optimized prompt is saved with timestamp and metadata
2. Searchable list with full-text search
3. One-click replay (re-copy to clipboard)
4. Tag prompts by project

**Storage**: Tauri store with indexed JSON.
**Angular**: `PromptHistoryService` with search via simple filter on signals array.
