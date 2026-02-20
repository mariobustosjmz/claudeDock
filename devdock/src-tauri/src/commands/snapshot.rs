use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use crate::commands::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowInfo {
    pub app_name: String,
    pub title: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceSnapshot {
    pub id: String,
    pub name: String,
    pub created_at: u64,
    pub windows: Vec<WindowInfo>,
}

#[tauri::command]
pub async fn get_open_windows() -> Result<Vec<WindowInfo>, AppError> {
    #[cfg(target_os = "macos")]
    return get_open_windows_macos();

    #[cfg(target_os = "windows")]
    return get_open_windows_windows();

    #[cfg(target_os = "linux")]
    return get_open_windows_linux();

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return Ok(vec![]);
}

#[cfg(target_os = "macos")]
fn get_open_windows_macos() -> Result<Vec<WindowInfo>, AppError> {
    use std::process::Command;

    let script = r#"
        set windowList to {}
        tell application "System Events"
            set allProcesses to every process whose background only is false
            repeat with proc in allProcesses
                set procName to name of proc
                repeat with win in (every window of proc)
                    set winTitle to name of win
                    set winPos to position of win
                    set winSize to size of win
                    set end of windowList to {procName, winTitle, item 1 of winPos, item 2 of winPos, item 1 of winSize, item 2 of winSize}
                end repeat
            end repeat
        end tell
        return windowList
    "#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| AppError::Window(format!("AppleScript failed: {e}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Window(format!("AppleScript error: {stderr}")));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let windows = parse_applescript_windows(stdout.trim());
    Ok(windows)
}

#[cfg(target_os = "linux")]
fn get_open_windows_linux() -> Result<Vec<WindowInfo>, AppError> {
    use std::process::Command;

    let output = Command::new("wmctrl")
        .arg("-lG")
        .output()
        .map_err(|_| AppError::Window(
            "wmctrl not found. Install with: sudo apt install wmctrl".to_string(),
        ))?;

    if !output.status.success() {
        return Ok(vec![]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut windows = Vec::new();

    for line in stdout.lines() {
        // wmctrl -lG format: ID DESKTOP X Y W H HOST TITLE...
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 8 {
            let Ok(x) = parts[2].parse::<i32>() else { continue };
            let Ok(y) = parts[3].parse::<i32>() else { continue };
            let Ok(w) = parts[4].parse::<i32>() else { continue };
            let Ok(h) = parts[5].parse::<i32>() else { continue };
            let title = parts[7..].join(" ");
            if w > 10 && h > 10 && !title.is_empty() {
                windows.push(WindowInfo {
                    app_name: String::new(),
                    title,
                    x,
                    y,
                    width: w,
                    height: h,
                });
            }
        }
    }
    Ok(windows)
}

#[cfg(target_os = "windows")]
fn get_open_windows_windows() -> Result<Vec<WindowInfo>, AppError> {
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowRect, GetWindowTextW, IsWindowVisible,
    };

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }
        let mut buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut buf);
        if len == 0 {
            return BOOL(1);
        }
        let title = String::from_utf16_lossy(&buf[..len as usize]);
        let mut rect = RECT::default();
        if GetWindowRect(hwnd, &mut rect).is_ok() {
            let w = rect.right - rect.left;
            let h = rect.bottom - rect.top;
            if w > 10 && h > 10 {
                // SAFETY: lparam is a valid *mut Vec<WindowInfo> we own
                let acc = &mut *(lparam.0 as *mut Vec<WindowInfo>);
                acc.push(WindowInfo {
                    app_name: String::new(),
                    title,
                    x: rect.left,
                    y: rect.top,
                    width: w,
                    height: h,
                });
            }
        }
        BOOL(1)
    }

    let mut acc: Vec<WindowInfo> = Vec::new();
    let ptr = &mut acc as *mut Vec<WindowInfo> as isize;
    unsafe {
        EnumWindows(Some(enum_proc), LPARAM(ptr))
            .map_err(|e| AppError::Window(format!("EnumWindows failed: {e}")))?;
    }
    Ok(acc)
}

#[cfg(target_os = "macos")]
fn sanitize_applescript_string(s: &str) -> Result<String, AppError> {
    let has_invalid = s.contains('"')
        || s.contains('\'')
        || s.contains('\\')
        || s.contains('\n')
        || s.contains('\r')
        || s.contains('\0')
        || s.chars().any(|c| c.is_control());
    if has_invalid {
        return Err(AppError::Window(
            "Invalid characters in window identifier: rejected".to_string(),
        ));
    }
    Ok(s.to_string())
}

#[cfg(target_os = "macos")]
fn parse_applescript_windows(output: &str) -> Vec<WindowInfo> {
    let mut windows = Vec::new();
    if output.is_empty() {
        return windows;
    }

    // AppleScript returns nested lists as comma-separated values.
    // Format: app, title, x, y, width, height, app, title, x, y, width, height, ...
    let values: Vec<&str> = output.split(", ").collect();
    let mut i = 0;
    while i + 5 < values.len() {
        let app_name = values[i].trim_matches('{').trim().to_string();
        let title = values[i + 1].trim().to_string();
        let Ok(x) = values[i + 2].trim().parse::<i32>() else {
            log::warn!("parse_applescript_windows: skipping record at index {i}, field parse failed");
            i += 6;
            continue;
        };
        let Ok(y) = values[i + 3].trim().parse::<i32>() else {
            i += 6;
            continue;
        };
        let Ok(width) = values[i + 4].trim().parse::<i32>() else {
            i += 6;
            continue;
        };
        let Ok(height) = values[i + 5].trim_matches('}').trim().parse::<i32>() else {
            i += 6;
            continue;
        };

        if !app_name.is_empty() && width > 0 && height > 0 {
            windows.push(WindowInfo { app_name, title, x, y, width, height });
        }
        i += 6;
    }
    windows
}

#[tauri::command]
pub async fn save_snapshot(name: String, windows: Vec<WindowInfo>) -> Result<WorkspaceSnapshot, AppError> {
    if name.trim().is_empty() {
        return Err(AppError::Window("Snapshot name cannot be empty".to_string()));
    }

    let created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Window(e.to_string()))?
        .as_secs();

    let id = format!(
        "snapshot-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| AppError::Window(e.to_string()))?
            .as_millis()
    );

    Ok(WorkspaceSnapshot {
        id,
        name: name.trim().to_string(),
        created_at,
        windows,
    })
}

#[tauri::command]
pub async fn restore_snapshot(snapshot: WorkspaceSnapshot) -> Result<(), AppError> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        for window in &snapshot.windows {
            let safe_app = match sanitize_applescript_string(&window.app_name) {
                Ok(s) => s,
                Err(_) => {
                    log::warn!(
                        "restore_snapshot: skipping window with invalid app_name: {:?}",
                        window.app_name
                    );
                    continue;
                }
            };
            let safe_title = match sanitize_applescript_string(&window.title) {
                Ok(s) => s,
                Err(_) => {
                    log::warn!(
                        "restore_snapshot: skipping window with invalid title: {:?}",
                        window.title
                    );
                    continue;
                }
            };

            let script = format!(
                r#"tell application "System Events"
                    try
                        tell process "{app}"
                            set position of window "{title}" to {{{x}, {y}}}
                            set size of window "{title}" to {{{w}, {h}}}
                        end tell
                    end try
                end tell"#,
                app = safe_app,
                title = safe_title,
                x = window.x,
                y = window.y,
                w = window.width,
                h = window.height,
            );

            match Command::new("osascript").arg("-e").arg(&script).output() {
                Ok(out) if !out.status.success() => {
                    log::warn!(
                        "restore_snapshot: failed to reposition '{}' in '{}'",
                        window.title,
                        window.app_name
                    );
                }
                Err(e) => {
                    log::warn!(
                        "restore_snapshot: osascript spawn failed for '{}': {e}",
                        window.app_name
                    );
                }
                _ => {}
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = snapshot;
    }

    Ok(())
}
