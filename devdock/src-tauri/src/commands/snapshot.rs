use std::process::Command;
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
        let x = values[i + 2].trim().parse::<i32>().unwrap_or(0);
        let y = values[i + 3].trim().parse::<i32>().unwrap_or(0);
        let width = values[i + 4].trim().parse::<i32>().unwrap_or(0);
        let height = values[i + 5].trim_matches('}').trim().parse::<i32>().unwrap_or(0);

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

    let id = format!("snapshot-{created_at}");

    Ok(WorkspaceSnapshot {
        id,
        name: name.trim().to_string(),
        created_at,
        windows,
    })
}

#[tauri::command]
pub async fn restore_snapshot(snapshot: WorkspaceSnapshot) -> Result<(), AppError> {
    for window in &snapshot.windows {
        let script = format!(
            r#"tell application "System Events"
                try
                    tell process "{app}"
                        set position of window "{title}" to {{{x}, {y}}}
                        set size of window "{title}" to {{{w}, {h}}}
                    end tell
                end try
            end tell"#,
            app = window.app_name,
            title = window.title,
            x = window.x,
            y = window.y,
            w = window.width,
            h = window.height,
        );

        // Best-effort: skip failures for individual windows
        let _ = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output();
    }
    Ok(())
}
