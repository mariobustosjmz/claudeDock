use tauri::{AppHandle, Manager, WebviewWindow};
use crate::commands::AppError;

pub fn get_main_window(app: &AppHandle) -> Result<WebviewWindow, AppError> {
    app.get_webview_window("main")
        .ok_or_else(|| AppError::Window("Main window not found".to_string()))
}

pub fn set_position(app: &AppHandle, x: f64, y: f64) -> Result<(), AppError> {
    let window = get_main_window(app)?;
    window
        .set_position(tauri::PhysicalPosition::new(x as i32, y as i32))
        .map_err(|e| AppError::Window(e.to_string()))
}

pub fn get_position(app: &AppHandle) -> Result<(f64, f64), AppError> {
    let window = get_main_window(app)?;
    let pos = window
        .outer_position()
        .map_err(|e| AppError::Window(e.to_string()))?;
    Ok((pos.x as f64, pos.y as f64))
}

pub fn toggle_visibility(app: &AppHandle) -> Result<bool, AppError> {
    let window = get_main_window(app)?;
    let visible = window
        .is_visible()
        .map_err(|e| AppError::Window(e.to_string()))?;
    if visible {
        window.hide().map_err(|e| AppError::Window(e.to_string()))?;
    } else {
        window.show().map_err(|e| AppError::Window(e.to_string()))?;
    }
    Ok(!visible)
}

pub fn set_always_on_top(app: &AppHandle, enabled: bool) -> Result<(), AppError> {
    let window = get_main_window(app)?;
    window
        .set_always_on_top(enabled)
        .map_err(|e| AppError::Window(e.to_string()))
}
