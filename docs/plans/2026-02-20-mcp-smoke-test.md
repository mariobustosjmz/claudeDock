# DevDock MCP Smoke Test — All 17 Tools

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Systematically exercise every tauri-plugin-mcp-bridge MCP tool against the running DevDock app to produce a findings report covering DOM state, IPC traffic, panel functionality, console errors, and backend state.

**Architecture:** Start DevDock dev server → connect via `driver_session` on WS port 9223 → walk through all 10 panels using UI automation tools → capture IPC traffic with monitor → inspect backend state → collect all console errors → write findings report.

**Tech Stack:** tauri-plugin-mcp-bridge 0.8.3, mcp-server-tauri, Angular 19 Signals, Tauri v2 Rust backend

---

### Task 1: Start DevDock

**Files:**
- Run: `devdock/` via `pnpm dev`

**Step 1: Launch DevDock in background**

```bash
cd /Users/mariobustosjmz/Desktop/claude/dock/devdock
pnpm dev &
```

Wait ~15s for Vite + Tauri to compile and the WebSocket server on port 9223 to start.

**Step 2: Verify WebSocket is listening**

```bash
lsof -i :9223 | grep LISTEN
```
Expected: a process named `devdock` or similar listening on 9223.

---

### Task 2: driver_session — Start automation session

**Tool:** `driver_session`
- action: `start`

Expected: `{ "status": "connected", "port": 9223, "appName": "devdock" }`

Note any connection errors. If port 9223 is not available, the plugin auto-increments to 9224–9322 — check `lsof -i :9223-9322`.

---

### Task 3: manage_window — Inventory windows

**Tool:** `manage_window`
- action: `list`

Expected: at least one window — `main` (the dock). Note any extra windows (preview, screenshot overlay).

**Tool:** `manage_window`
- action: `info`, windowLabel: `main`

Record: `{ width, height, x, y, title, focused, visible, scaleFactor }`. Verify dock is within screen bounds.

---

### Task 4: webview_dom_snapshot — Full DOM baseline

**Tool:** `webview_dom_snapshot`
- type: `accessibility`
- windowLabel: `main`

Save the snapshot mentally as baseline. Check for:
- `app-root` present
- `app-dock` present
- Dock buttons visible (at least 8 role=button elements)
- No `[ERROR]` or `[WARN]` attributes

**Tool:** `webview_dom_snapshot`
- type: `structure`

Cross-reference structural DOM vs accessibility tree.

---

### Task 5: webview_screenshot — Initial state capture

**Tool:** `webview_screenshot`
- windowLabel: `main`
- type: `jpeg`
- quality: 90

Save screenshot. Verify:
- Dock renders (not blank)
- Panel area is closed (default state)
- Dock buttons visible

---

### Task 6: ipc_monitor — Start IPC capture

**Tool:** `ipc_monitor`
- action: `start`

This must be started BEFORE interacting with panels so all IPC calls are captured.

Expected: `{ "monitoring": true }`

---

### Task 7: webview_find_element + webview_interact — Walk all 10 panels

For each panel below, do:
1. `webview_find_element` to locate the button
2. `webview_interact` to click it
3. `webview_wait_for` to confirm panel opens
4. `webview_screenshot` to capture state

#### Panel 1: Screenshot (camera icon)
```
webview_find_element: { by: "css", value: "[data-panel='SCREENSHOT'], button[title*='screenshot' i], .dock-btn:first-child" }
webview_interact: { action: "click", ref: <ref from above> }
webview_wait_for: { text: "Screenshot" }
webview_screenshot: {}
```

#### Panel 2: Prompt Optimizer
```
webview_find_element: { by: "text", value: "Prompt" }
webview_interact: click
webview_wait_for: { text: "Optimize" }
webview_screenshot: {}
```

#### Panel 3: Voice
```
webview_find_element: { by: "css", value: "[data-panel='VOICE'], button[title*='voice' i]" }
webview_interact: click
webview_wait_for: { text: "Microphone" }
webview_screenshot: {}
```

#### Panel 4: Agents
```
webview_find_element: { by: "text", value: "Agent" }
webview_interact: click
webview_wait_for: { text: "Running" }
webview_screenshot: {}
```

#### Panel 5: Preview
```
webview_find_element: { by: "css", value: "[data-panel='PREVIEW']" }
webview_interact: click
webview_wait_for: { text: "Preview" }
webview_screenshot: {}
```

#### Panel 6: Snapshots
```
webview_find_element: { by: "text", value: "Snapshot" }
webview_interact: click
webview_wait_for: { text: "Save" }
webview_screenshot: {}
```

#### Panel 7: Actions
```
webview_find_element: { by: "css", value: "[data-panel='ACTIONS']" }
webview_interact: click
webview_wait_for: { text: "Action" }
webview_screenshot: {}
```

#### Panel 8: Shorts
```
webview_find_element: { by: "text", value: "Short" }
webview_interact: click
webview_wait_for: { text: "tip" }
webview_screenshot: {}
```

#### Panel 9: Settings
```
webview_find_element: { by: "css", value: "[data-panel='SETTINGS']" }
webview_interact: click
webview_wait_for: { text: "Settings" }
webview_screenshot: {}
```

#### Panel 10: Account
```
webview_find_element: { by: "text", value: "Account" }
webview_interact: click
webview_wait_for: { text: "Plan" }
webview_screenshot: {}
```

---

### Task 8: webview_get_styles — Check computed styles

With Settings panel open, inspect key elements:

**Tool:** `webview_get_styles`
- selector: `.dock-panel` or `app-settings`
- properties: `["background-color", "color", "display", "visibility", "opacity", "z-index"]`

Verify theme CSS variables are applied (not raw `var(--)`), panel has proper z-index above dock.

**Tool:** `webview_get_styles`
- selector: `body`
- properties: `["background-color", "font-family"]`

Verify transparent background for frameless window.

---

### Task 9: webview_execute_js — Angular Signals introspection

**Tool:** `webview_execute_js`
```javascript
// Check Angular version
return window['ng']?.version?.full || 'not exposed';
```

**Tool:** `webview_execute_js`
```javascript
// Check if app is bootstrapped
const appRoot = document.querySelector('app-root');
return appRoot ? 'bootstrapped' : 'not found';
```

**Tool:** `webview_execute_js`
```javascript
// Check localStorage/tauri store keys
return Object.keys(localStorage).filter(k => k.includes('dock') || k.includes('devdock'));
```

**Tool:** `webview_execute_js`
```javascript
// Check for any Angular error state
const errors = [];
document.querySelectorAll('[ng-reflect-ng-class*="error"]').forEach(el => errors.push(el.tagName));
return errors;
```

---

### Task 10: webview_keyboard — Test keyboard shortcuts

**Tool:** `webview_keyboard`
- action: `press`
- key: `Escape`

Expected: any open panel closes (or no crash).

**Tool:** `webview_keyboard`
- action: `type`
- text: `test prompt`
- element: prompt textarea (find first)

Verify text appears in input.

---

### Task 11: webview_wait_for — Async state verification

Navigate to Agents panel first:
```
webview_interact: click agents button
webview_wait_for: { text: "Claude Code" OR "No agents running", timeout: 5000 }
```

Navigate to Prompt panel:
```
webview_interact: click prompt button
webview_wait_for: { selector: "textarea, input[type='text']", timeout: 3000 }
```

---

### Task 12: ipc_monitor stop + ipc_get_captured — IPC audit

**Tool:** `ipc_monitor`
- action: `stop`

**Tool:** `ipc_get_captured`
- filter: none (get all)

Analyze captured events:
- List all unique command names called
- Check for any `error` responses
- Verify expected commands appeared: `get_running_agents`, `get_dock_position`, `get_project_context`
- Flag any unexpected or failing commands

---

### Task 13: ipc_execute_command — Direct IPC command testing

**Tool:** `ipc_execute_command`
- command: `get_screen_info`
- args: `{}`

Expected: `{ width, height, scaleFactor }`

**Tool:** `ipc_execute_command`
- command: `get_running_agents`
- args: `{}`

Expected: array (may be empty if no AI agents running)

**Tool:** `ipc_execute_command`
- command: `get_dock_position`
- args: `{}`

Expected: `{ x, y, edge }` or similar position object

**Tool:** `ipc_execute_command`
- command: `get_project_context`
- args: `{}`

Expected: project metadata (git root, package.json info)

---

### Task 14: ipc_emit_event — Event handler verification

**Tool:** `ipc_emit_event`
- event: `open-settings`
- payload: `{}`

Expected: Settings panel opens (verify with `webview_wait_for: { text: "Settings" }`)

**Tool:** `ipc_emit_event`
- event: `tauri://update-available`
- payload: `{ version: "9.9.9", notes: "test update" }`

Check if update notification appears (may not if updater is disabled in dev).

---

### Task 15: ipc_get_backend_state — Rust state inspection

**Tool:** `ipc_get_backend_state`

Expected object containing:
- `RecordingState` — should be `{ is_recording: false }`
- `PendingUpdate` — should be `null`
- `UpdaterEnabled` — should be `false` (disabled in dev)

Flag any unexpected state values.

---

### Task 16: read_logs — Console error audit

**Tool:** `read_logs`
- source: `console`
- level: `error`

List all console errors. Categorize:
- **Critical**: app-breaking errors
- **Warning**: degraded functionality
- **Noise**: expected dev-mode warnings

**Tool:** `read_logs`
- source: `console`
- level: `warning`

Check for Angular `ExpressionChangedAfterItHasBeenCheckedError`, unhandled promise rejections, or Tauri permission errors.

---

### Task 17: get_setup_instructions — Plugin health check

**Tool:** `get_setup_instructions`

Verify plugin version matches `0.8.3` (what's in Cargo.toml). Note any recommended updates.

---

### Task 18: driver_session stop + Write findings report

**Tool:** `driver_session`
- action: `stop`

**Write report to:** `docs/mcp-smoke-test-report-2026-02-20.md`

Report sections:
1. **Summary** — pass/fail per panel, overall health
2. **Window State** — dimensions, position
3. **DOM Health** — snapshot findings
4. **Panel Test Results** — table: panel | opens | screenshot | notes
5. **IPC Audit** — commands observed, any errors
6. **Console Errors** — categorized list
7. **Backend State** — Rust managed state values
8. **Bugs Found** — numbered list with screenshots
9. **Recommendations** — what to fix

---

## Execution

Plan saved. Two options:

**1. Subagent-Driven (this session)** — dispatch fresh subagent per task group, review between, fast iteration

**2. Parallel Session** — open new session with executing-plans for batch execution with checkpoints

Which approach?
