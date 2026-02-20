Create a new DevDock feature module for: $ARGUMENTS

Follow the feature module pattern from docs/ARCHITECTURE.md:

1. Create the feature directory under `src/app/features/{feature-name}/`
2. Create these files:
   - `{feature-name}.component.ts` — Standalone, OnPush, thin template binding only
   - `{feature-name}.service.ts` — All business logic, Tauri IPC invoke calls
   - `{feature-name}.state.ts` — Signals-based state (signal, computed, effect)
   - `models/{feature-name}.model.ts` — All interfaces and types
   - `{feature-name}.routes.ts` — Lazy-loaded route config with loadComponent

3. If Rust backend commands are needed, create:
   - `src-tauri/src/commands/{feature_name}.rs` — Thin command handlers
   - Add structs to `src-tauri/src/models/` with serde Serialize/Deserialize
   - Register commands in `main.rs` invoke_handler

4. Wire the feature into the dock shell:
   - Add button entry to dock configuration
   - Add lazy route in main app routes

Follow all code style rules from CLAUDE.md. Every type must be explicit. Use inject() for DI.
