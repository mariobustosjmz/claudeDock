use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    AppHandle, Emitter, Manager,
};

use super::AppError;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextMenuItemDef {
    pub id: String,
    pub label: String,
    pub separator: bool,
}

/// Shows a native OS popup context menu built from the given items.
///
/// Because Tauri v2's `popup_menu` is fire-and-forget (selection arrives via
/// `MenuEvent`), this command shows the menu and registers a one-time listener
/// that emits a `context-menu-selected` event back to the frontend with the
/// chosen item id (or an empty string when dismissed).
///
/// The frontend service listens for that event and resolves the promise.
#[tauri::command]
pub async fn show_context_menu(
    app: AppHandle,
    items: Vec<ContextMenuItemDef>,
) -> Result<(), AppError> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| AppError::Window("main window not found".into()))?;

    let menu = Menu::new(&app).map_err(|e| AppError::Window(e.to_string()))?;

    for item in &items {
        if item.separator {
            let sep = PredefinedMenuItem::separator(&app)
                .map_err(|e| AppError::Window(e.to_string()))?;
            menu.append(&sep)
                .map_err(|e| AppError::Window(e.to_string()))?;
        } else {
            let menu_item = MenuItem::with_id(&app, &item.id, &item.label, true, None::<&str>)
                .map_err(|e| AppError::Window(e.to_string()))?;
            menu.append(&menu_item)
                .map_err(|e| AppError::Window(e.to_string()))?;
        }
    }

    // Register a per-call menu event listener on the window.
    // The callback emits `context-menu-selected` back to the frontend.
    let app_handle = app.clone();
    window.on_menu_event(move |_win, event| {
        let _ = app_handle.emit("context-menu-selected", event.id.0.as_str());
    });

    window
        .popup_menu(&menu)
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(())
}
