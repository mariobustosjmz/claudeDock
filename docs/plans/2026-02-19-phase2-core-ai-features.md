# Phase 2: Core AI Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Smart Screenshot (F2), Prompt Optimizer (F3), Voice Input (F4), and Prompt History (F10) inside the existing DevDock Tauri v2 + Angular 20 application.

**Architecture:** Four standalone Angular features added under `src/app/features/`, each with their own service, component, and models. Rust backend expanded with `screenshot`, `audio`, and `context` command modules. All AI API calls (Groq, Whisper) are made from Angular using Angular HttpClient — no backend proxy needed since the Tauri WebView supports standard web fetch.

**Tech Stack:** Tauri v2 (Rust), Angular 20 standalone + Signals, TailwindCSS 4, Groq API (llama-3.3-70b-versatile), OpenAI Whisper API, `screenshots` crate (Rust screen capture), `cpal` + `hound` crates (Rust audio), `base64` crate, Angular HttpClient.

---

## Pre-Checks Before Starting

1. Run `pnpm tauri dev` to verify Phase 1 app builds and runs cleanly.
2. Read `src/app/core/services/storage.service.ts` — all history is stored via this service.
3. Read `src/app/features/settings/settings.service.ts` — API keys (Groq, OpenAI, Deepgram) are already stored there under `settings.apiKeys.groq`, `settings.apiKeys.openai`, `settings.apiKeys.deepgram`.
4. Read `src/app/features/dock/components/dock-panel.component.ts` — each new feature panel is wired in here with `@case`.
5. Read `src-tauri/src/commands/mod.rs` — AppError enum lives here, import it in new command files.
6. Read `src-tauri/src/lib.rs` — new commands must be registered in `invoke_handler!`.

---

## Task 1: Add Rust Crate Dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml`

### Step 1: Add crates to Cargo.toml

Open `src-tauri/Cargo.toml`. Under `[dependencies]`, add:

```toml
screenshots = "0.8"
cpal = "0.15"
hound = "3.5"
base64 = "0.22"
image = { version = "0.25", features = ["png"] }
```

### Step 2: Verify compilation

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | head -50
```

Expected: All crates download and compile. If `screenshots` fails on Linux, check system deps (`libxcb`). On macOS it should work directly.

### Step 3: Commit

```bash
git add src-tauri/Cargo.toml
git commit -m "feat: add screenshot, audio, and image crates"
```

---

## Task 2: Rust — Screenshot Capture Command

**Files:**
- Create: `src-tauri/src/commands/screenshot.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

### Step 1: Create screenshot command file

Create `src-tauri/src/commands/screenshot.rs`:

```rust
use base64::{engine::general_purpose, Engine as _};
use image::{ImageBuffer, Rgba};
use screenshots::Screen;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct CaptureResult {
    pub image_base64: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
}

#[tauri::command]
pub async fn capture_region(
    _app: AppHandle,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<CaptureResult, AppError> {
    let screens = Screen::all().map_err(|e| AppError::Screenshot(e.to_string()))?;

    // Find the screen that contains the top-left corner of the region
    let screen = screens
        .iter()
        .find(|s| {
            let info = s.display_info;
            x >= info.x
                && y >= info.y
                && x < info.x + info.width as i32
                && y < info.y + info.height as i32
        })
        .or_else(|| screens.first())
        .ok_or_else(|| AppError::Screenshot("No screen found".to_string()))?;

    let image = screen
        .capture_area(x, y, width, height)
        .map_err(|e| AppError::Screenshot(e.to_string()))?;

    let rgba_image: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_raw(image.width(), image.height(), image.rgba().to_vec())
            .ok_or_else(|| AppError::Screenshot("Failed to create image buffer".to_string()))?;

    let mut png_bytes: Vec<u8> = Vec::new();
    rgba_image
        .write_to(
            &mut std::io::Cursor::new(&mut png_bytes),
            image::ImageFormat::Png,
        )
        .map_err(|e| AppError::Screenshot(e.to_string()))?;

    let encoded = general_purpose::STANDARD.encode(&png_bytes);

    Ok(CaptureResult {
        image_base64: encoded,
        width: image.width(),
        height: image.height(),
        x,
        y,
    })
}

#[tauri::command]
pub async fn get_screen_info(_app: AppHandle) -> Result<Vec<ScreenInfo>, AppError> {
    let screens = Screen::all().map_err(|e| AppError::Screenshot(e.to_string()))?;

    Ok(screens
        .iter()
        .map(|s| ScreenInfo {
            id: s.display_info.id,
            x: s.display_info.x,
            y: s.display_info.y,
            width: s.display_info.width,
            height: s.display_info.height,
            scale_factor: s.display_info.scale_factor,
        })
        .collect())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScreenInfo {
    pub id: u32,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f32,
}
```

### Step 2: Add Screenshot variant to AppError and expose submodule

In `src-tauri/src/commands/mod.rs`, add:
- `pub mod screenshot;` in the module declarations
- `Screenshot(String)` variant to `AppError` enum

```rust
#[error("Screenshot operation failed: {0}")]
Screenshot(String),
```

### Step 3: Register commands in lib.rs

In `src-tauri/src/lib.rs`, add to `invoke_handler!`:
```rust
commands::screenshot::capture_region,
commands::screenshot::get_screen_info,
```

### Step 4: Build and verify

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | grep -E "^error"
```

Expected: No errors.

### Step 5: Commit

```bash
git add src-tauri/src/commands/screenshot.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat: add capture_region and get_screen_info Rust commands"
```

---

## Task 3: Rust — Screenshot Overlay Window

The overlay is a second Tauri window opened programmatically. When the user wants to select a region, we open a fullscreen transparent window. The Angular app at route `/screenshot-overlay` renders the selection UI. On selection, it emits a Tauri event and closes.

**Files:**
- Modify: `src-tauri/src/commands/screenshot.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json` (capabilities section if needed)

### Step 1: Add open_screenshot_overlay command

Append to `src-tauri/src/commands/screenshot.rs`:

```rust
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn open_screenshot_overlay(app: AppHandle) -> Result<(), AppError> {
    // Close existing overlay if open
    if let Some(existing) = app.get_webview_window("screenshot-overlay") {
        existing
            .close()
            .map_err(|e| AppError::Screenshot(e.to_string()))?;
    }

    let _window = WebviewWindowBuilder::new(
        &app,
        "screenshot-overlay",
        WebviewUrl::App("index.html#/screenshot-overlay".into()),
    )
    .fullscreen(true)
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .shadow(false)
    .skip_taskbar(true)
    .build()
    .map_err(|e| AppError::Screenshot(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn close_screenshot_overlay(app: AppHandle) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window("screenshot-overlay") {
        window
            .close()
            .map_err(|e| AppError::Screenshot(e.to_string()))?;
    }
    Ok(())
}
```

### Step 2: Register new commands in lib.rs

Add to invoke_handler:
```rust
commands::screenshot::open_screenshot_overlay,
commands::screenshot::close_screenshot_overlay,
```

### Step 3: Build verify

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | grep -E "^error"
```

### Step 4: Commit

```bash
git add src-tauri/src/commands/screenshot.rs src-tauri/src/lib.rs
git commit -m "feat: add screenshot overlay window commands"
```

---

## Task 4: Angular — Screenshot Overlay Route

**Files:**
- Create: `src/app/features/screenshot/screenshot-overlay.component.ts`
- Modify: `src/app/app.routes.ts`

### Step 1: Create the overlay component

Create `src/app/features/screenshot/screenshot-overlay.component.ts`:

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

@Component({
  selector: 'app-screenshot-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 cursor-crosshair select-none"
      style="background: rgba(0,0,0,0.01);"
      (mousedown)="onMouseDown($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp($event)"
      (keydown.escape)="onEscape()"
      tabindex="0"
      #overlayRef
    >
      @if (isDragging()) {
        <div
          class="absolute border-2 border-blue-400 bg-blue-400/10"
          [style.left.px]="selectionStyle().left"
          [style.top.px]="selectionStyle().top"
          [style.width.px]="selectionStyle().width"
          [style.height.px]="selectionStyle().height"
        ></div>
        <div
          class="absolute text-white text-xs bg-black/60 px-1 rounded"
          [style.left.px]="selectionStyle().left + 4"
          [style.top.px]="selectionStyle().top + 4"
        >
          {{ selectionStyle().width }} × {{ selectionStyle().height }}
        </div>
      }
      <div class="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-3 py-1 rounded-full">
        Drag to select region · ESC to cancel
      </div>
    </div>
  `,
})
export class ScreenshotOverlayComponent implements OnInit, OnDestroy {
  @ViewChild('overlayRef') overlayRef!: ElementRef<HTMLDivElement>;

  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;

  readonly isDragging = signal(false);
  readonly selectionStyle = signal({ left: 0, top: 0, width: 0, height: 0 });

  ngOnInit(): void {
    setTimeout(() => this.overlayRef?.nativeElement.focus(), 100);
  }

  ngOnDestroy(): void {}

  onMouseDown(e: MouseEvent): void {
    this.startX = e.screenX;
    this.startY = e.screenY;
    this.currentX = e.screenX;
    this.currentY = e.screenY;
    this.isDragging.set(true);
    this.updateStyle();
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging()) return;
    this.currentX = e.screenX;
    this.currentY = e.screenY;
    this.updateStyle();
  }

  async onMouseUp(e: MouseEvent): Promise<void> {
    if (!this.isDragging()) return;
    this.isDragging.set(false);

    const rect = this.normalizeRect();
    if (rect.width < 10 || rect.height < 10) {
      await this.closeOverlay();
      return;
    }

    await emit('screenshot-region-selected', rect);
    await this.closeOverlay();
  }

  async onEscape(): Promise<void> {
    await emit('screenshot-region-cancelled', {});
    await this.closeOverlay();
  }

  private updateStyle(): void {
    const rect = this.normalizeRect();
    this.selectionStyle.set({
      left: this.startX < this.currentX ? e.clientX - (this.currentX - this.startX) : e.clientX,
      top: this.startY < this.currentY ? e.clientY - (this.currentY - this.startY) : e.clientY,
      width: rect.width,
      height: rect.height,
    });
  }

  private normalizeRect(): SelectionRect & { width: number; height: number } {
    const x = Math.min(this.startX, this.currentX);
    const y = Math.min(this.startY, this.currentY);
    const width = Math.abs(this.currentX - this.startX);
    const height = Math.abs(this.currentY - this.startY);
    return { startX: x, startY: y, endX: x + width, endY: y + height, width, height };
  }

  private async closeOverlay(): Promise<void> {
    const win = getCurrentWebviewWindow();
    await win.close();
  }
}
```

**Note:** The `updateStyle` method uses screen coordinates for the selection rect but client coordinates for positioning the visual. This needs the overlay to be fullscreen so they align. Review the coordinate logic during testing and adjust if needed.

### Step 2: Add overlay route to app.routes.ts

In `src/app/app.routes.ts`, add:
```typescript
{
  path: 'screenshot-overlay',
  loadComponent: () =>
    import('./features/screenshot/screenshot-overlay.component').then(
      (m) => m.ScreenshotOverlayComponent
    ),
},
```

### Step 3: Commit

```bash
git add src/app/features/screenshot/screenshot-overlay.component.ts src/app/app.routes.ts
git commit -m "feat: add screenshot overlay route and selection component"
```

---

## Task 5: Angular — Screenshot Feature Panel

**Files:**
- Create: `src/app/features/screenshot/models/screenshot.model.ts`
- Create: `src/app/features/screenshot/screenshot.service.ts`
- Create: `src/app/features/screenshot/screenshot.component.ts`
- Modify: `src/app/features/dock/components/dock-panel.component.ts`

### Step 1: Create screenshot model

Create `src/app/features/screenshot/models/screenshot.model.ts`:

```typescript
export interface ScreenshotEntry {
  id: string;
  imageBase64: string;
  width: number;
  height: number;
  x: number;
  y: number;
  capturedAt: number;
  label?: string;
}

export interface CaptureResult {
  image_base64: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface ScreenRegion {
  startX: number;
  startY: number;
  width: number;
  height: number;
}
```

### Step 2: Create screenshot service

Create `src/app/features/screenshot/screenshot.service.ts`:

```typescript
import { Injectable, computed, inject, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { writeImageBase64, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { StorageService } from '../../core/services/storage.service';
import { CaptureResult, ScreenRegion, ScreenshotEntry } from './models/screenshot.model';

@Injectable({ providedIn: 'root' })
export class ScreenshotService {
  private readonly storage = inject(StorageService);
  private readonly STORE_NAME = 'screenshots';
  private readonly STORE_KEY = 'entries';
  private readonly MAX_ENTRIES = 20;

  private readonly _screenshots = signal<ScreenshotEntry[]>([]);
  private readonly _isCapturing = signal(false);
  private readonly _lastError = signal<string | null>(null);

  readonly screenshots = this._screenshots.asReadonly();
  readonly isCapturing = this._isCapturing.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly latestScreenshot = computed(() => this._screenshots()[0] ?? null);

  constructor() {
    this.loadFromStorage();
    this.listenForRegionSelection();
  }

  async openOverlay(): Promise<void> {
    this._lastError.set(null);
    this._isCapturing.set(true);
    try {
      await invoke('open_screenshot_overlay');
    } catch (err) {
      this._isCapturing.set(false);
      this._lastError.set(String(err));
    }
  }

  async copyToClipboard(entry: ScreenshotEntry): Promise<void> {
    try {
      // Write as text with base64 data URL so AI tools can interpret it
      await writeText(`data:image/png;base64,${entry.imageBase64}`);
    } catch (err) {
      this._lastError.set(String(err));
    }
  }

  deleteEntry(id: string): void {
    this._screenshots.update((list) => list.filter((e) => e.id !== id));
    this.saveToStorage();
  }

  private listenForRegionSelection(): void {
    listen<{ startX: number; startY: number; width: number; height: number }>(
      'screenshot-region-selected',
      async (event) => {
        const region = event.payload;
        await this.captureRegion(region);
      }
    );

    listen('screenshot-region-cancelled', () => {
      this._isCapturing.set(false);
    });
  }

  private async captureRegion(region: ScreenRegion): Promise<void> {
    try {
      const result = await invoke<CaptureResult>('capture_region', {
        x: region.startX,
        y: region.startY,
        width: region.width,
        height: region.height,
      });

      const entry: ScreenshotEntry = {
        id: `ss_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        imageBase64: result.image_base64,
        width: result.width,
        height: result.height,
        x: result.x,
        y: result.y,
        capturedAt: Date.now(),
      };

      this._screenshots.update((list) => [entry, ...list].slice(0, this.MAX_ENTRIES));
      this.saveToStorage();

      // Auto-copy the new screenshot
      await this.copyToClipboard(entry);
    } catch (err) {
      this._lastError.set(String(err));
    } finally {
      this._isCapturing.set(false);
    }
  }

  private async loadFromStorage(): Promise<void> {
    const saved = await this.storage.get<ScreenshotEntry[]>(
      this.STORE_NAME,
      this.STORE_KEY
    );
    if (saved) {
      this._screenshots.set(saved);
    }
  }

  private saveToStorage(): void {
    this.storage.set(this.STORE_NAME, this.STORE_KEY, this._screenshots());
  }
}
```

**Note:** `@tauri-apps/plugin-clipboard-manager` must be added. Check if it's already in package.json. If not, run `pnpm add @tauri-apps/plugin-clipboard-manager` and add `tauri-plugin-clipboard-manager` to Cargo.toml + lib.rs.

### Step 3: Create screenshot component

Create `src/app/features/screenshot/screenshot.component.ts`:

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { ScreenshotEntry } from './models/screenshot.model';
import { ScreenshotService } from './screenshot.service';

@Component({
  selector: 'app-screenshot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 p-3 h-full">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-white/90">Smart Screenshot</h2>
        <button
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          [class]="screenshotService.isCapturing()
            ? 'bg-yellow-500/20 text-yellow-300 cursor-wait'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'"
          (click)="capture()"
          [disabled]="screenshotService.isCapturing()"
        >
          @if (screenshotService.isCapturing()) {
            Capturing…
          } @else {
            + Capture Region
          }
        </button>
      </div>

      @if (screenshotService.lastError()) {
        <p class="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1">
          {{ screenshotService.lastError() }}
        </p>
      }

      @if (screenshotService.screenshots().length === 0) {
        <div class="flex-1 flex items-center justify-center text-white/30 text-xs text-center">
          No screenshots yet.<br>Click "Capture Region" to select an area.
        </div>
      } @else {
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          @for (entry of screenshotService.screenshots(); track entry.id) {
            <div class="group relative rounded-lg overflow-hidden border border-white/10 hover:border-indigo-400/50 transition-colors">
              <img
                [src]="'data:image/png;base64,' + entry.imageBase64"
                [alt]="'Screenshot ' + entry.width + 'x' + entry.height"
                class="w-full object-cover max-h-32"
              />
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="text-white/60 text-xs">{{ entry.width }}×{{ entry.height }}</span>
                <div class="flex gap-1">
                  <button
                    class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded"
                    (click)="copy(entry)"
                  >
                    Copy
                  </button>
                  <button
                    class="text-xs bg-red-600/80 hover:bg-red-500 text-white px-2 py-0.5 rounded"
                    (click)="delete(entry.id)"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ScreenshotComponent {
  readonly screenshotService = inject(ScreenshotService);

  async capture(): Promise<void> {
    await this.screenshotService.openOverlay();
  }

  async copy(entry: ScreenshotEntry): Promise<void> {
    await this.screenshotService.copyToClipboard(entry);
  }

  delete(id: string): void {
    this.screenshotService.deleteEntry(id);
  }
}
```

### Step 4: Wire in dock-panel.component.ts

In `src/app/features/dock/components/dock-panel.component.ts`, add case for SCREENSHOT:

```typescript
// Add import:
import { ScreenshotComponent } from '../../screenshot/screenshot.component';

// Add to imports array in @Component decorator

// In the @switch template:
@case ('SCREENSHOT') {
  <app-screenshot />
}
```

### Step 5: Build and test

```bash
pnpm tauri dev
```

Click the Screenshot dock button. Panel should open. Click "Capture Region" — overlay window should open. Draw a rectangle. Screenshot should appear in gallery.

### Step 6: Commit

```bash
git add src/app/features/screenshot/
git add src/app/features/dock/components/dock-panel.component.ts
git commit -m "feat: implement screenshot capture panel (F2)"
```

---

## Task 6: Rust — Project Context Command

**Files:**
- Create: `src-tauri/src/commands/context.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

### Step 1: Create context command file

Create `src-tauri/src/commands/context.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;

use super::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectContext {
    pub git_root: Option<String>,
    pub project_name: Option<String>,
    pub package_json: Option<PackageInfo>,
    pub recent_commits: Vec<String>,
    pub current_branch: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageInfo {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub main_dependencies: Vec<String>,
}

#[tauri::command]
pub async fn get_project_context(
    _app: AppHandle,
    path: Option<String>,
) -> Result<ProjectContext, AppError> {
    let start_path = path
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    let git_root = find_git_root(&start_path);

    let (package_json, project_name) = if let Some(ref root) = git_root {
        let pkg_path = PathBuf::from(root).join("package.json");
        let pkg = read_package_json(&pkg_path);
        let name = pkg.as_ref().map(|p| p.name.clone());
        (pkg, name)
    } else {
        (None, None)
    };

    let (recent_commits, current_branch) = if let Some(ref root) = git_root {
        (get_recent_commits(root), get_current_branch(root))
    } else {
        (vec![], None)
    };

    Ok(ProjectContext {
        git_root,
        project_name,
        package_json,
        recent_commits,
        current_branch,
    })
}

fn find_git_root(start: &PathBuf) -> Option<String> {
    let output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(start)
        .output()
        .ok()?;

    if output.status.success() {
        String::from_utf8(output.stdout)
            .ok()
            .map(|s| s.trim().to_string())
    } else {
        None
    }
}

fn read_package_json(path: &PathBuf) -> Option<PackageInfo> {
    let content = std::fs::read_to_string(path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;

    let name = json["name"].as_str()?.to_string();
    let version = json["version"].as_str().unwrap_or("0.0.0").to_string();
    let description = json["description"].as_str().map(|s| s.to_string());

    let mut deps: Vec<String> = vec![];
    if let Some(d) = json["dependencies"].as_object() {
        deps.extend(d.keys().take(10).cloned());
    }
    if let Some(d) = json["devDependencies"].as_object() {
        deps.extend(d.keys().take(5).cloned());
    }

    Some(PackageInfo {
        name,
        version,
        description,
        main_dependencies: deps,
    })
}

fn get_recent_commits(git_root: &str) -> Vec<String> {
    let output = Command::new("git")
        .args(["log", "--oneline", "-5"])
        .current_dir(git_root)
        .output()
        .ok();

    output
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.lines().map(|l| l.to_string()).collect())
        .unwrap_or_default()
}

fn get_current_branch(git_root: &str) -> Option<String> {
    let output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(git_root)
        .output()
        .ok()?;

    String::from_utf8(output.stdout)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}
```

### Step 2: Register module and command

In `src-tauri/src/commands/mod.rs`:
```rust
pub mod context;
```

In `src-tauri/src/lib.rs`, add to invoke_handler:
```rust
commands::context::get_project_context,
```

### Step 3: Verify build

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | grep -E "^error"
```

### Step 4: Commit

```bash
git add src-tauri/src/commands/context.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat: add get_project_context Rust command"
```

---

## Task 7: Angular Setup — HttpClient

**Files:**
- Modify: `src/app/app.config.ts`

### Step 1: Add provideHttpClient

In `src/app/app.config.ts`, add `provideHttpClient()` to the providers array:

```typescript
import { provideHttpClient } from '@angular/common/http';

// In ApplicationConfig.providers:
provideHttpClient(),
```

### Step 2: Verify build

```bash
pnpm build 2>&1 | grep -E "^Error"
```

### Step 3: Commit

```bash
git add src/app/app.config.ts
git commit -m "feat: add HttpClient provider for AI API calls"
```

---

## Task 8: Angular — Prompt Optimizer Feature

**Files:**
- Create: `src/app/features/prompt/models/prompt.model.ts`
- Create: `src/app/features/prompt/prompt.service.ts`
- Create: `src/app/features/prompt/prompt.component.ts`
- Modify: `src/app/features/dock/components/dock-panel.component.ts`

### Step 1: Create prompt model

Create `src/app/features/prompt/models/prompt.model.ts`:

```typescript
export interface StructuredPrompt {
  context: string;
  file: string;
  action: string;
  expected: string;
}

export interface OptimizeRequest {
  rawPrompt: string;
  projectContext?: string;
}

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature: number;
  max_tokens: number;
}

export interface GroqChoice {
  message: { content: string };
}

export interface GroqResponse {
  choices: GroqChoice[];
}
```

### Step 2: Create prompt service

Create `src/app/features/prompt/prompt.service.ts`:

```typescript
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { firstValueFrom } from 'rxjs';
import { SettingsService } from '../settings/settings.service';
import {
  GroqRequest,
  GroqResponse,
  OptimizeRequest,
  StructuredPrompt,
} from './models/prompt.model';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a developer assistant that restructures rough developer prompts into precise, structured instructions for AI coding agents.

Given a developer's rough prompt and optional project context, respond ONLY with valid JSON in this exact format:
{
  "context": "Brief description of the current situation and what the developer is working on",
  "file": "The specific file path(s) that should be modified, or 'Multiple files' if unclear",
  "action": "Precise description of what action should be taken",
  "expected": "What the expected outcome or behavior should be after the change"
}

Rules:
- Be specific and technical
- Infer file paths from context if possible
- Keep each field under 150 characters
- Do not include markdown, only raw JSON`;

@Injectable({ providedIn: 'root' })
export class PromptService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(SettingsService);

  private readonly _isOptimizing = signal(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _currentResult = signal<StructuredPrompt | null>(null);
  private readonly _responseTime = signal<number | null>(null);

  readonly isOptimizing = this._isOptimizing.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly currentResult = this._currentResult.asReadonly();
  readonly responseTime = this._responseTime.asReadonly();
  readonly hasResult = computed(() => this._currentResult() !== null);

  async optimize(request: OptimizeRequest): Promise<StructuredPrompt | null> {
    const apiKey = this.settings.settings().apiKeys?.groq;
    if (!apiKey) {
      this._lastError.set('Groq API key not configured. Set it in Settings.');
      return null;
    }

    this._isOptimizing.set(true);
    this._lastError.set(null);
    const startTime = performance.now();

    try {
      const projectContext = await this.buildProjectContext();
      const userContent = this.buildUserContent(request, projectContext);

      const body: GroqRequest = {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 512,
      };

      const headers = new HttpHeaders({
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      });

      const response = await firstValueFrom(
        this.http.post<GroqResponse>(GROQ_API_URL, body, { headers })
      );

      const rawJson = response.choices[0]?.message?.content ?? '';
      const structured = this.parseStructuredResponse(rawJson);
      this._currentResult.set(structured);
      this._responseTime.set(Math.round(performance.now() - startTime));
      return structured;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this._lastError.set(`API error: ${message}`);
      return null;
    } finally {
      this._isOptimizing.set(false);
    }
  }

  clearResult(): void {
    this._currentResult.set(null);
    this._lastError.set(null);
    this._responseTime.set(null);
  }

  private async buildProjectContext(): Promise<string> {
    try {
      const ctx = await invoke<{
        project_name?: string;
        current_branch?: string;
        recent_commits: string[];
        package_json?: { main_dependencies: string[] };
      }>('get_project_context', { path: null });

      const parts: string[] = [];
      if (ctx.project_name) parts.push(`Project: ${ctx.project_name}`);
      if (ctx.current_branch) parts.push(`Branch: ${ctx.current_branch}`);
      if (ctx.recent_commits.length) {
        parts.push(`Recent commits: ${ctx.recent_commits.slice(0, 3).join('; ')}`);
      }
      if (ctx.package_json?.main_dependencies.length) {
        parts.push(`Stack: ${ctx.package_json.main_dependencies.slice(0, 5).join(', ')}`);
      }
      return parts.join('\n');
    } catch {
      return '';
    }
  }

  private buildUserContent(request: OptimizeRequest, context: string): string {
    const parts = [`Developer prompt: "${request.rawPrompt}"`];
    if (context) parts.push(`\nProject context:\n${context}`);
    if (request.projectContext) parts.push(`\nAdditional context: ${request.projectContext}`);
    return parts.join('\n');
  }

  private parseStructuredResponse(raw: string): StructuredPrompt {
    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned) as StructuredPrompt;
    } catch {
      return {
        context: 'Could not parse response',
        file: 'Unknown',
        action: raw.slice(0, 200),
        expected: 'Check the raw response',
      };
    }
  }
}
```

### Step 3: Create prompt component

Create `src/app/features/prompt/prompt.component.ts`:

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { PromptHistoryService } from './services/prompt-history.service';
import { PromptService } from './prompt.service';
import { StructuredPrompt } from './models/prompt.model';

@Component({
  selector: 'app-prompt',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 p-3 h-full">
      <h2 class="text-sm font-semibold text-white/90">Prompt Optimizer</h2>

      <textarea
        class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-400/50 transition-colors"
        rows="3"
        placeholder="Type your rough prompt… e.g. fix the sidebar overflow"
        [(ngModel)]="rawPrompt"
        (keydown.ctrl.enter)="optimize()"
      ></textarea>

      <div class="flex items-center gap-2">
        <button
          class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
          [class]="promptService.isOptimizing()
            ? 'bg-white/10 text-white/40 cursor-wait'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'"
          (click)="optimize()"
          [disabled]="promptService.isOptimizing() || !rawPrompt().trim()"
        >
          @if (promptService.isOptimizing()) { Optimizing… } @else { ⚡ Optimize (Ctrl+Enter) }
        </button>
        @if (promptService.hasResult()) {
          <button
            class="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
            (click)="clear()"
          >Clear</button>
        }
      </div>

      @if (promptService.lastError()) {
        <p class="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1">
          {{ promptService.lastError() }}
        </p>
      }

      @if (promptService.currentResult(); as result) {
        <div class="flex-1 overflow-y-auto space-y-2">
          @if (promptService.responseTime()) {
            <p class="text-xs text-white/30 text-right">{{ promptService.responseTime() }}ms</p>
          }

          @for (field of resultFields(result); track field.label) {
            <div class="bg-white/5 rounded-lg p-2.5 border border-white/10">
              <p class="text-xs text-indigo-400 font-medium mb-1">{{ field.label }}</p>
              <p class="text-xs text-white/80 leading-relaxed">{{ field.value }}</p>
            </div>
          }

          <button
            class="w-full py-2 rounded-lg text-xs font-medium bg-green-600/80 hover:bg-green-500 text-white transition-colors"
            (click)="copyResult(result)"
          >
            📋 Copy Full Prompt
          </button>
        </div>
      }
    </div>
  `,
})
export class PromptComponent {
  readonly promptService = inject(PromptService);
  private readonly historyService = inject(PromptHistoryService);

  readonly rawPrompt = signal('');

  async optimize(): Promise<void> {
    const raw = this.rawPrompt().trim();
    if (!raw || this.promptService.isOptimizing()) return;

    const result = await this.promptService.optimize({ rawPrompt: raw });
    if (result) {
      await this.historyService.save(raw, result);
    }
  }

  clear(): void {
    this.promptService.clearResult();
    this.rawPrompt.set('');
  }

  async copyResult(result: StructuredPrompt): Promise<void> {
    const text = `**Context:** ${result.context}\n**File:** ${result.file}\n**Action:** ${result.action}\n**Expected:** ${result.expected}`;
    await writeText(text);
  }

  resultFields(result: StructuredPrompt): Array<{ label: string; value: string }> {
    return [
      { label: 'Context', value: result.context },
      { label: 'File', value: result.file },
      { label: 'Action', value: result.action },
      { label: 'Expected', value: result.expected },
    ];
  }
}
```

### Step 4: Wire dock panel

In `dock-panel.component.ts`, add:
```typescript
@case ('PROMPT') {
  <app-prompt />
}
```

With corresponding import.

### Step 5: Build and test manually

1. Set a Groq API key in Settings panel.
2. Open Prompt panel. Type "fix the sidebar overflow".
3. Click Optimize. Result should appear in ~200ms with 4 structured fields.
4. Click "Copy Full Prompt" — paste into any text editor to verify.

### Step 6: Commit

```bash
git add src/app/features/prompt/
git add src/app/features/dock/components/dock-panel.component.ts
git commit -m "feat: implement prompt optimizer panel (F3)"
```

---

## Task 9: Angular — Prompt History (F10)

**Files:**
- Create: `src/app/features/prompt/models/prompt-history.model.ts`
- Create: `src/app/features/prompt/services/prompt-history.service.ts`
- Create: `src/app/features/prompt/prompt-history.component.ts`

### Step 1: Create history model

Create `src/app/features/prompt/models/prompt-history.model.ts`:

```typescript
import { StructuredPrompt } from './prompt.model';

export interface PromptHistoryEntry {
  id: string;
  rawInput: string;
  result: StructuredPrompt;
  projectName?: string;
  tags: string[];
  createdAt: number;
}
```

### Step 2: Create history service

Create `src/app/features/prompt/services/prompt-history.service.ts`:

```typescript
import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { PromptHistoryEntry } from '../models/prompt-history.model';
import { StructuredPrompt } from '../models/prompt.model';

@Injectable({ providedIn: 'root' })
export class PromptHistoryService {
  private readonly storage = inject(StorageService);
  private readonly STORE_NAME = 'prompt-history';
  private readonly STORE_KEY = 'entries';
  private readonly MAX_ENTRIES = 100;

  private readonly _entries = signal<PromptHistoryEntry[]>([]);
  private readonly _searchQuery = signal('');

  readonly searchQuery = this._searchQuery.asReadonly();
  readonly filteredEntries = computed(() => {
    const q = this._searchQuery().toLowerCase();
    if (!q) return this._entries();
    return this._entries().filter(
      (e) =>
        e.rawInput.toLowerCase().includes(q) ||
        e.result.action.toLowerCase().includes(q) ||
        e.result.context.toLowerCase().includes(q) ||
        (e.projectName?.toLowerCase().includes(q) ?? false)
    );
  });

  constructor() {
    this.loadFromStorage();
  }

  async save(rawInput: string, result: StructuredPrompt, projectName?: string): Promise<void> {
    const entry: PromptHistoryEntry = {
      id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      rawInput,
      result,
      projectName,
      tags: [],
      createdAt: Date.now(),
    };

    this._entries.update((list) => [entry, ...list].slice(0, this.MAX_ENTRIES));
    await this.storage.set(this.STORE_NAME, this.STORE_KEY, this._entries());
  }

  deleteEntry(id: string): void {
    this._entries.update((list) => list.filter((e) => e.id !== id));
    this.storage.set(this.STORE_NAME, this.STORE_KEY, this._entries());
  }

  setSearchQuery(q: string): void {
    this._searchQuery.set(q);
  }

  private async loadFromStorage(): Promise<void> {
    const saved = await this.storage.get<PromptHistoryEntry[]>(this.STORE_NAME, this.STORE_KEY);
    if (saved) this._entries.set(saved);
  }
}
```

### Step 3: Create history component (tab inside prompt panel)

The history is a tab inside the existing prompt panel. Modify `prompt.component.ts` to add tab switching:

Add a tab toggle (`input` | `history`) signal to `PromptComponent`. When `history` tab is active, show a scrollable list of past entries with copy + delete. Use the `filteredEntries` signal for the list.

Key template additions:
```html
<!-- Tab row -->
<div class="flex border-b border-white/10 -mx-3 px-3">
  <button (click)="activeTab.set('input')" [class.border-indigo-400]="activeTab() === 'input'" class="pb-1.5 text-xs mr-4 border-b-2 border-transparent">Optimizer</button>
  <button (click)="activeTab.set('history')" [class.border-indigo-400]="activeTab() === 'history'" class="pb-1.5 text-xs border-b-2 border-transparent">History</button>
</div>

@if (activeTab() === 'history') {
  <input ... [(ngModel)]="searchQuery" placeholder="Search history…" />
  @for (entry of historyService.filteredEntries(); track entry.id) {
    <!-- entry card with copy + delete buttons -->
  }
}
```

### Step 4: Commit

```bash
git add src/app/features/prompt/
git commit -m "feat: add prompt history with search (F10)"
```

---

## Task 10: Rust — Audio Recording Commands

**Files:**
- Create: `src-tauri/src/commands/audio.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

### Step 1: Create audio command file

Create `src-tauri/src/commands/audio.rs`:

```rust
use base64::{engine::general_purpose, Engine as _};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri::State;

use super::AppError;

pub struct RecordingState {
    pub samples: Arc<Mutex<Vec<f32>>>,
    pub is_recording: Arc<Mutex<bool>>,
    pub sample_rate: Arc<Mutex<u32>>,
    pub channels: Arc<Mutex<u16>>,
}

impl Default for RecordingState {
    fn default() -> Self {
        Self {
            samples: Arc::new(Mutex::new(Vec::new())),
            is_recording: Arc::new(Mutex::new(false)),
            sample_rate: Arc::new(Mutex::new(44100)),
            channels: Arc::new(Mutex::new(1)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioResult {
    pub wav_base64: String,
    pub duration_seconds: f32,
    pub sample_rate: u32,
}

#[tauri::command]
pub async fn start_recording(
    _app: AppHandle,
    state: State<'_, RecordingState>,
) -> Result<(), AppError> {
    let mut is_rec = state
        .is_recording
        .lock()
        .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?;

    if *is_rec {
        return Err(AppError::Audio("Already recording".to_string()));
    }

    state
        .samples
        .lock()
        .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?
        .clear();

    *is_rec = true;
    drop(is_rec);

    let samples_clone = Arc::clone(&state.samples);
    let is_recording_clone = Arc::clone(&state.is_recording);
    let sample_rate_state = Arc::clone(&state.sample_rate);
    let channels_state = Arc::clone(&state.channels);

    std::thread::spawn(move || {
        let host = cpal::default_host();
        let device = match host.default_input_device() {
            Some(d) => d,
            None => return,
        };

        let config = match device.default_input_config() {
            Ok(c) => c,
            Err(_) => return,
        };

        let sr = config.sample_rate().0;
        let ch = config.channels();

        if let Ok(mut r) = sample_rate_state.lock() {
            *r = sr;
        }
        if let Ok(mut c) = channels_state.lock() {
            *c = ch;
        }

        let samples_inner = Arc::clone(&samples_clone);
        let is_rec_inner = Arc::clone(&is_recording_clone);

        let stream = device
            .build_input_stream(
                &config.into(),
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    if let Ok(rec) = is_rec_inner.lock() {
                        if !*rec {
                            return;
                        }
                    }
                    if let Ok(mut s) = samples_inner.lock() {
                        s.extend_from_slice(data);
                    }
                },
                |_err| {},
                None,
            )
            .ok();

        if let Some(stream) = stream {
            stream.play().ok();
            loop {
                std::thread::sleep(std::time::Duration::from_millis(100));
                if let Ok(rec) = is_recording_clone.lock() {
                    if !*rec {
                        break;
                    }
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_recording(
    _app: AppHandle,
    state: State<'_, RecordingState>,
) -> Result<AudioResult, AppError> {
    {
        let mut is_rec = state
            .is_recording
            .lock()
            .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?;
        *is_rec = false;
    }

    std::thread::sleep(std::time::Duration::from_millis(200));

    let samples = state
        .samples
        .lock()
        .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?
        .clone();

    let sample_rate = *state
        .sample_rate
        .lock()
        .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?;

    let channels = *state
        .channels
        .lock()
        .map_err(|_| AppError::Audio("Lock poisoned".to_string()))?;

    let duration = samples.len() as f32 / (sample_rate as f32 * channels as f32);

    let wav_bytes = encode_wav(&samples, sample_rate, channels)
        .map_err(|e| AppError::Audio(e.to_string()))?;

    let wav_base64 = general_purpose::STANDARD.encode(&wav_bytes);

    Ok(AudioResult {
        wav_base64,
        duration_seconds: duration,
        sample_rate,
    })
}

fn encode_wav(samples: &[f32], sample_rate: u32, channels: u16) -> Result<Vec<u8>, hound::Error> {
    let mut cursor = std::io::Cursor::new(Vec::new());
    let spec = hound::WavSpec {
        channels,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = hound::WavWriter::new(&mut cursor, spec)?;
    for &sample in samples {
        let int_sample = (sample * i16::MAX as f32).clamp(i16::MIN as f32, i16::MAX as f32) as i16;
        writer.write_sample(int_sample)?;
    }
    writer.finalize()?;
    Ok(cursor.into_inner())
}
```

### Step 2: Add Audio error variant and module

In `commands/mod.rs`:
```rust
pub mod audio;

// In AppError:
#[error("Audio operation failed: {0}")]
Audio(String),
```

### Step 3: Register state and commands in lib.rs

```rust
use commands::audio::RecordingState;

// In .setup() or after builder:
.manage(RecordingState::default())
// In invoke_handler:
commands::audio::start_recording,
commands::audio::stop_recording,
```

### Step 4: Build verify

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | grep -E "^error"
```

**Note:** `cpal` on macOS requires the `Microphone` permission in the app's entitlements. Add to `src-tauri/entitlements.plist`:
```xml
<key>com.apple.security.device.audio-input</key>
<true/>
```
And add to `tauri.conf.json` under `bundle.macOS.entitlements`: `"../entitlements.plist"`.

### Step 5: Commit

```bash
git add src-tauri/src/commands/audio.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat: add audio recording Rust commands"
```

---

## Task 11: Angular — Voice Input Feature

**Files:**
- Create: `src/app/features/voice/models/voice.model.ts`
- Create: `src/app/features/voice/voice.service.ts`
- Create: `src/app/features/voice/voice.component.ts`
- Modify: `src/app/features/dock/components/dock-panel.component.ts`

### Step 1: Create voice model

Create `src/app/features/voice/models/voice.model.ts`:

```typescript
export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'done';

export interface TranscriptionResult {
  text: string;
  duration: number;
}
```

### Step 2: Create voice service

Create `src/app/features/voice/voice.service.ts`:

```typescript
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { firstValueFrom } from 'rxjs';
import { SettingsService } from '../settings/settings.service';
import { RecordingState, TranscriptionResult } from './models/voice.model';

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(SettingsService);

  private readonly _state = signal<RecordingState>('idle');
  private readonly _transcription = signal('');
  private readonly _lastError = signal<string | null>(null);
  private readonly _duration = signal<number | null>(null);

  readonly state = this._state.asReadonly();
  readonly transcription = this._transcription.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly duration = this._duration.asReadonly();
  readonly isRecording = computed(() => this._state() === 'recording');
  readonly hasText = computed(() => this._transcription().length > 0);

  async startRecording(): Promise<void> {
    this._lastError.set(null);
    this._state.set('recording');
    try {
      await invoke('start_recording');
    } catch (err) {
      this._state.set('idle');
      this._lastError.set(String(err));
    }
  }

  async stopAndTranscribe(): Promise<void> {
    if (this._state() !== 'recording') return;

    const apiKey = this.settings.settings().apiKeys?.openai;
    if (!apiKey) {
      this._lastError.set('OpenAI API key not set. Configure in Settings.');
      await this.stopRecordingOnly();
      return;
    }

    this._state.set('transcribing');
    try {
      const audioResult = await invoke<{ wav_base64: string; duration_seconds: number }>(
        'stop_recording'
      );

      this._duration.set(audioResult.duration_seconds);

      const transcription = await this.transcribeAudio(audioResult.wav_base64, apiKey);
      this._transcription.set(transcription);
      this._state.set('done');
    } catch (err) {
      this._lastError.set(String(err));
      this._state.set('idle');
    }
  }

  clearTranscription(): void {
    this._transcription.set('');
    this._state.set('idle');
    this._lastError.set(null);
    this._duration.set(null);
  }

  private async stopRecordingOnly(): Promise<void> {
    try {
      await invoke('stop_recording');
    } catch {}
    this._state.set('idle');
  }

  private async transcribeAudio(wavBase64: string, apiKey: string): Promise<string> {
    const binaryStr = atob(wavBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', blob, 'recording.wav');
    formData.append('model', 'whisper-1');

    const headers = new HttpHeaders({ Authorization: `Bearer ${apiKey}` });
    const response = await firstValueFrom(
      this.http.post<{ text: string }>(WHISPER_URL, formData, { headers })
    );

    return response.text;
  }
}
```

### Step 3: Create voice component

Create `src/app/features/voice/voice.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { VoiceService } from './voice.service';

@Component({
  selector: 'app-voice',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4 p-3 h-full items-center">
      <h2 class="text-sm font-semibold text-white/90 self-start">Voice Input</h2>

      <!-- Record Button -->
      <button
        class="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 text-2xl"
        [class]="recordButtonClass()"
        (click)="toggleRecording()"
        [disabled]="voiceService.state() === 'transcribing'"
      >
        @switch (voiceService.state()) {
          @case ('idle') { 🎤 }
          @case ('recording') { ⏹ }
          @case ('transcribing') { ⏳ }
          @case ('done') { 🎤 }
        }
      </button>

      <p class="text-xs text-white/50">
        @switch (voiceService.state()) {
          @case ('idle') { Tap to start recording }
          @case ('recording') { Recording… tap to stop }
          @case ('transcribing') { Transcribing… }
          @case ('done') { Done! }
        }
      </p>

      @if (voiceService.lastError()) {
        <p class="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1 w-full text-center">
          {{ voiceService.lastError() }}
        </p>
      }

      @if (voiceService.transcription()) {
        <div class="w-full flex-1 flex flex-col gap-2">
          <textarea
            class="w-full flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none"
            readonly
            [value]="voiceService.transcription()"
          ></textarea>
          <div class="flex gap-2">
            <button
              class="flex-1 py-1.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              (click)="sendToPrompt()"
            >
              → Send to Optimizer
            </button>
            <button
              class="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-white/70"
              (click)="voiceService.clearTranscription()"
            >Clear</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class VoiceComponent {
  readonly voiceService = inject(VoiceService);
  readonly sendText = output<string>();

  recordButtonClass(): string {
    switch (this.voiceService.state()) {
      case 'recording':
        return 'bg-red-600 animate-pulse scale-110 shadow-lg shadow-red-500/40';
      case 'transcribing':
        return 'bg-yellow-600/50 cursor-wait';
      default:
        return 'bg-white/10 hover:bg-indigo-600/50 hover:scale-105';
    }
  }

  async toggleRecording(): Promise<void> {
    const state = this.voiceService.state();
    if (state === 'idle' || state === 'done') {
      await this.voiceService.startRecording();
    } else if (state === 'recording') {
      await this.voiceService.stopAndTranscribe();
    }
  }

  sendToPrompt(): void {
    const text = this.voiceService.transcription();
    if (text) this.sendText.emit(text);
  }
}
```

### Step 4: Wire dock panel

Add `VOICE` case to `dock-panel.component.ts`.

### Step 5: Test manually

1. Open Voice panel. Set OpenAI key in Settings.
2. Click mic button. Speak clearly.
3. Click stop. Transcription appears.
4. Click "Send to Optimizer" — verify it fills the prompt optimizer input.

For "Send to Optimizer" integration: `DockPanelComponent` needs to handle the `sendText` output from VoiceComponent and route it to `PromptService`. Add event wiring in `dock-panel.component.ts`.

### Step 6: Commit

```bash
git add src/app/features/voice/
git add src/app/features/dock/components/dock-panel.component.ts
git commit -m "feat: implement voice input with Whisper transcription (F4)"
```

---

## Task 12: Update PLAN.md and Final Verification

**Files:**
- Modify: `docs/PLAN.md`

### Step 1: Update all Phase 2 checkboxes in PLAN.md

Mark all completed tasks as `[x]`.

### Step 2: Full build verification

```bash
pnpm tauri build 2>&1 | tail -20
```

Expected: Build succeeds and generates distributable artifact.

### Step 3: Run lint

```bash
pnpm lint
```

Fix any lint errors before committing.

### Step 4: Final commit

```bash
git add docs/PLAN.md
git commit -m "docs: mark Phase 2 complete in PLAN.md"
```

---

## Common Pitfalls & Notes

1. **Clipboard plugin**: If `@tauri-apps/plugin-clipboard-manager` is not in `package.json`, run `pnpm add @tauri-apps/plugin-clipboard-manager` and add `tauri-plugin-clipboard-manager = "2"` to `Cargo.toml` plus register in `lib.rs`.

2. **Screenshot overlay coordinates**: On macOS with Retina displays, screen coordinates vs CSS pixels differ by scale factor. Use `get_screen_info` to get the scale factor and adjust capture coordinates accordingly.

3. **cpal on macOS**: If `start_recording` fails with permission denied, the app needs `NSMicrophoneUsageDescription` in `Info.plist` AND the microphone entitlement. This is required for notarization.

4. **Groq API CORS**: Groq API allows browser requests. No proxy needed.

5. **Audio FormData with Whisper**: The `Content-Type` header for multipart must NOT be set manually — let the browser set it automatically with the boundary. Do not add `Content-Type` to the HttpHeaders for the Whisper call.

6. **Screenshot overlay on macOS**: The overlay window needs `com.apple.security.screen-recording` entitlement, or the user must grant Screen Recording permission to the app in System Settings → Privacy & Security.

7. **Settings apiKeys structure**: Check the actual field names in `settings.model.ts` and `settings.service.ts` — the API key fields may be `groqKey`, `openaiKey`, etc. rather than `apiKeys.groq`. Adjust accordingly.
