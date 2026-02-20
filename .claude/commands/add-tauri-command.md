Add a new Tauri IPC command for: $ARGUMENTS

Steps:
1. Create or update the command file in `src-tauri/src/commands/`
2. Define input/output structs in `src-tauri/src/models/` with `#[derive(Serialize, Deserialize)]`
3. Create the command function with `#[tauri::command]` — keep it thin, delegate to a service
4. Create or update the service in `src-tauri/src/services/` with the actual logic
5. Register the command in `src-tauri/src/main.rs` in the `invoke_handler` macro
6. Add any required Tauri plugins or capabilities
7. Create the TypeScript invoke wrapper in the corresponding Angular service:
   ```typescript
   import { invoke } from '@tauri-apps/api/core';
   const result = await invoke<ResponseType>('command_name', { param });
   ```
8. Run `cargo clippy --manifest-path src-tauri/Cargo.toml` to verify Rust code
9. Run `cargo test --manifest-path src-tauri/Cargo.toml` if tests exist

Always use `Result<T, AppError>` return types. Never use `unwrap()`.
