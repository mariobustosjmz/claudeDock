use tauri::AppHandle;
use crate::commands::AppError;
use crate::services::window_service;

#[specta::specta]
#[tauri::command]
pub fn set_dock_position(app: AppHandle, x: f64, y: f64) -> Result<(), AppError> {
    window_service::set_position(&app, x, y)
}

#[specta::specta]
#[tauri::command]
pub fn get_dock_position(app: AppHandle) -> Result<(f64, f64), AppError> {
    window_service::get_position(&app)
}

#[specta::specta]
#[tauri::command]
pub fn toggle_dock_visibility(app: AppHandle) -> Result<bool, AppError> {
    window_service::toggle_visibility(&app)
}

#[specta::specta]
#[tauri::command]
pub fn set_always_on_top(app: AppHandle, enabled: bool) -> Result<(), AppError> {
    window_service::set_always_on_top(&app, enabled)
}
