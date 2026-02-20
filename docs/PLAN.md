# DevDock Development Plan

## Phase 1: Foundation (Weeks 1-4)
- [x] **1.1** Initialize Tauri v2 project with Angular 19 + pnpm
- [x] **1.2** Configure TailwindCSS 4 with dark theme CSS variables
- [x] **1.3** Create DockShellComponent — frameless, transparent, always-on-top window
- [x] **1.4** Implement dock drag & drop repositioning (snap to screen edges)
- [x] **1.5** Implement dock auto-hide behavior (configurable)
- [x] **1.6** Create dock button strip with expandable panel system
- [x] **1.7** Implement Custom Action Buttons feature (F8)
  - [x] Settings UI for button configuration (name, icon, action, shortcut)
  - [x] Shell command execution via tauri-plugin-shell
  - [x] Global keyboard shortcut registration
  - [x] Persistent storage of button configs
- [x] **1.8** Tray icon with context menu (show/hide dock, settings, quit)
- [x] **1.9** Settings panel with basic preferences (position, theme, auto-start)
- [x] **1.10** Persistent storage setup (tauri-plugin-store)

## Phase 2: Core AI Features (Weeks 5-10)
- [ ] **2.1** Smart Screenshot feature (F2)
  - [ ] Fullscreen transparent overlay for region selection
  - [ ] Screen capture via Rust (screenshots crate)
  - [ ] UI element detection and numbering
  - [ ] Annotated image copy to clipboard
- [ ] **2.2** Prompt Optimizer feature (F3)
  - [ ] Groq API integration service
  - [ ] Project context detection (git root, package.json, recent files)
  - [ ] Structured prompt output panel
  - [ ] One-click copy to clipboard
- [ ] **2.3** Voice Input feature (F4)
  - [ ] Audio recording via Rust (cpal crate)
  - [ ] Whisper/Deepgram API integration for STT
  - [ ] Real-time transcription display
  - [ ] Integration with prompt optimizer
- [ ] **2.4** Prompt History feature (F10)
  - [ ] Save all optimized prompts with metadata
  - [ ] Search and filter by project/tag
  - [ ] One-click replay (copy to clipboard)

## Phase 3: Advanced Features (Weeks 11-18)
- [ ] **3.1** Agent Session Manager feature (F5)
  - [ ] Process detection for Claude Code, Cursor, Codex
  - [ ] Live status polling (running, idle, waiting)
  - [ ] Token/cost metrics parsing
  - [ ] Approve/deny actions inline
- [ ] **3.2** Preview Window feature (F6)
  - [ ] Secondary Tauri window with WebView
  - [ ] Click-to-select DOM inspector
  - [ ] CSS property editor panel
  - [ ] "Add to Prompt" generation
- [ ] **3.3** Workspace Snapshots feature (F7)
  - [ ] Window enumeration via OS APIs
  - [ ] Save snapshot (apps, positions, project path)
  - [ ] Restore snapshot
  - [ ] Multiple named snapshots per project
- [ ] **3.4** Educational Shorts feature (F9)
  - [ ] Video player component
  - [ ] Auto-trigger during AI agent processing
  - [ ] Content categorized by tech stack

## Phase 4: Polish & Launch (Weeks 19-24)
- [ ] **4.1** Auth system (simple email/password or OAuth)
- [ ] **4.2** Stripe payment integration
- [ ] **4.3** Auto-update mechanism (tauri-plugin-updater)
- [ ] **4.4** Multi-monitor support testing and fixes
- [ ] **4.5** Cross-platform testing (macOS + Windows + Linux)
- [ ] **4.6** Performance profiling and optimization
- [ ] **4.7** Landing page and documentation site
- [ ] **4.8** Build distribution artifacts (.dmg, .msi, .AppImage)
- [ ] **4.9** Beta release

## Current Status
**Active Phase**: Phase 2
**Next Task**: 2.1 — Smart Screenshot feature
