# DevDock - Floating Developer Dock for AI Coding

## Project Overview
DevDock is a lightweight floating dock (always-on-top panel) for developers using AI coding tools. Built with Tauri v2 + Angular 19 standalone components. The dock floats over all windows, providing instant access to smart screenshots, prompt optimization, voice input, agent monitoring, and custom actions without alt-tabbing.

## Tech Stack
- **Desktop Framework**: Tauri v2 (Rust backend + system WebView)
- **Frontend**: Angular 19 with standalone components, Signals, inject(), @if/@for, OnPush change detection
- **Styling**: TailwindCSS 4 with CSS variables for theming
- **State Management**: Angular Signals (no NgRx - keep it lightweight)
- **Backend Logic (Rust)**: Minimal - only for OS-level APIs (screen capture, process monitoring, global shortcuts, tray)
- **AI APIs**: Groq (prompt optimization), OpenAI Whisper or Deepgram (STT)
- **Build**: Vite as bundler (Tauri default)
- **Package Manager**: pnpm

## Commands
- `pnpm dev` — Start Tauri dev mode with hot reload
- `pnpm build` — Production build for current platform
- `pnpm tauri dev` — Tauri dev mode directly
- `pnpm tauri build` — Build distributable (.dmg, .msi, .AppImage)
- `pnpm lint` — ESLint + Angular lint
- `pnpm test` — Run unit tests (Vitest)
- `pnpm test:e2e` — Playwright e2e tests
- `cargo test --manifest-path src-tauri/Cargo.toml` — Rust unit tests
- `cargo clippy --manifest-path src-tauri/Cargo.toml` — Rust linter

## Architecture
```
devdock/
├── src/                          # Angular frontend
│   ├── app/
│   │   ├── core/                 # Singleton services, guards, interceptors
│   │   │   ├── services/         # All business logic lives here
│   │   │   ├── models/           # Interfaces & types (separate files)
│   │   │   └── utils/            # Pure utility functions
│   │   ├── features/             # Feature modules (lazy-loaded)
│   │   │   ├── dock/             # Main dock shell & layout
│   │   │   ├── screenshot/       # Smart screenshot feature
│   │   │   ├── prompt/           # Prompt optimizer + history
│   │   │   ├── voice/            # Voice input / STT
│   │   │   ├── agents/           # Agent session manager
│   │   │   ├── preview/          # Preview window + CSS editor
│   │   │   ├── snapshots/        # Workspace snapshots
│   │   │   ├── actions/          # Custom action buttons
│   │   │   ├── shorts/           # Educational shorts player
│   │   │   └── settings/         # App settings & preferences
│   │   └── shared/               # Shared components, pipes, directives
│   │       ├── components/       # Reusable UI components
│   │       └── directives/       # Shared directives
│   ├── assets/
│   ├── styles/                   # Global TailwindCSS + theme variables
│   └── environments/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri entry point
│   │   ├── lib.rs                # Module declarations
│   │   ├── commands/             # Tauri IPC commands (thin layer)
│   │   │   ├── mod.rs
│   │   │   ├── screenshot.rs     # Screen capture via OS APIs
│   │   │   ├── process.rs        # Process monitoring for agents
│   │   │   ├── shell.rs          # Shell command execution
│   │   │   ├── window.rs         # Window management & snapshots
│   │   │   └── audio.rs          # Audio recording
│   │   ├── services/             # Rust business logic
│   │   └── models/               # Rust structs & types
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Tauri configuration
│   ├── capabilities/             # Tauri v2 capability files
│   └── icons/
├── docs/                         # Living documentation
│   ├── ARCHITECTURE.md
│   ├── FEATURES.md
│   └── PLAN.md                   # Current phase plan & checklist
├── CLAUDE.md
└── package.json
```

## Code Style Rules (MANDATORY)
- **Strong typing**: No `any` type. Ever. Define interfaces in `models/` files.
- **Thin components**: Components only handle template binding. All logic in services via inject().
- **Services own logic**: Business logic, API calls, state transformations belong in services.
- **Standalone components**: Every component, directive, pipe must be standalone.
- **Signals for state**: Use Angular Signals (signal, computed, effect) for reactive state. No BehaviorSubject.
- **Inject pattern**: Use `inject()` function, not constructor injection.
- **Control flow**: Use @if/@for/@switch template syntax, not *ngIf/*ngFor.
- **OnPush**: Every component must use `changeDetection: ChangeDetectionStrategy.OnPush`.
- **Lazy loading**: Use `loadComponent` for route-based code splitting.
- **SOLID/KISS/DRY**: Follow strictly. Small, focused functions. Single responsibility.
- **No AI comments**: Never leave comments like "// AI generated" or "// TODO: implement". Write real code.
- **No hardcoded secrets**: API keys go in environment files, never committed. Use Tauri's secure storage.
- **Separate model files**: Interfaces and types get their own files in `models/` directories.
- **Repository pattern in Rust**: Tauri commands are thin controllers calling service functions.
- **Typed DTOs**: All Tauri IPC uses strongly typed structs with serde Serialize/Deserialize.
- **RESTful naming**: Tauri commands follow verb_noun pattern: `capture_screenshot`, `get_agents`, `save_snapshot`.
- **Error handling**: Use Result<T, E> in Rust. Typed error responses to frontend.
- **File naming**: kebab-case for Angular files. snake_case for Rust files.

## Tauri v2 Specifics
- Use `tauri::command` macro for IPC commands
- Register commands in `tauri::Builder::default().invoke_handler(tauri::generate_handler![...])`
- Use capability files in `src-tauri/capabilities/` for permission management
- Window configuration in `tauri.conf.json` under `app.windows`
- For always-on-top: set `alwaysOnTop: true` in window config
- For transparent/frameless: set `decorations: false`, `transparent: true`
- Use `tauri-plugin-shell` for shell commands
- Use `tauri-plugin-global-shortcut` for keyboard shortcuts
- Use `tauri-plugin-store` for persistent key-value storage
- Use `tauri-plugin-notification` for system notifications
- Use `tauri-plugin-autostart` for launch at login

## Testing Strategy
- Unit tests: Vitest for Angular services and utils. `cargo test` for Rust.
- Component tests: Angular Testing Library for component behavior.
- E2E: Playwright for critical user flows.
- Minimum coverage: 80% on services, 60% on components.

## Git Workflow
- Branch naming: `feat/feature-name`, `fix/bug-description`, `refactor/what`
- Commit messages: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`)
- Always create a feature branch. Never commit directly to main.
- Run `pnpm lint` and `pnpm test` before committing.

## Important Warnings
- NEVER use `any` type in TypeScript
- NEVER put business logic in components — services only
- NEVER use NgModules — everything is standalone
- NEVER use constructor DI — use inject() function
- NEVER hardcode API keys or secrets in source
- NEVER use *ngIf/*ngFor — use @if/@for
- NEVER skip OnPush change detection strategy
- In Rust: NEVER use unwrap() in production commands — always handle errors with Result
- In Rust: NEVER use println! for logging — use Tauri's log plugin
