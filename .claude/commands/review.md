Review the current codebase for DevDock quality standards.

Check these specific things:

**TypeScript/Angular:**
- [ ] No `any` types anywhere
- [ ] All components are standalone with OnPush
- [ ] All DI uses inject() not constructor
- [ ] Template uses @if/@for not *ngIf/*ngFor
- [ ] Business logic is in services, not components
- [ ] Interfaces are in separate model files
- [ ] Signals used for state (no BehaviorSubject)

**Rust/Tauri:**
- [ ] No unwrap() in command handlers
- [ ] All commands return Result<T, AppError>
- [ ] Structs have serde derives
- [ ] Commands are thin (logic in services)
- [ ] No println! (use log macros)

**General:**
- [ ] No hardcoded API keys or secrets
- [ ] No TODO/FIXME/AI-generated comments
- [ ] File naming conventions followed (kebab-case TS, snake_case Rust)
- [ ] Tests exist for services

Report findings with file:line references and fix any violations found.
