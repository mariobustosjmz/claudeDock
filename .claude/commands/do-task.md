Read docs/PLAN.md and find task $ARGUMENTS.

1. Read the task description and any related docs (FEATURES.md, ARCHITECTURE.md)
2. Create a brief execution plan (3-5 steps max)
3. Implement the task following all CLAUDE.md code style rules
4. After implementation:
   - Run `pnpm lint` for TypeScript
   - Run `cargo clippy --manifest-path src-tauri/Cargo.toml` if Rust files changed
   - Run `pnpm tauri dev` to verify it starts correctly
5. Mark the task as complete in docs/PLAN.md (change `- [ ]` to `- [x]`)
6. Git commit with message: `feat: [task description]`
