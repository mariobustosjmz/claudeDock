use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    AppHandle, Manager,
};

use super::AppError;

#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ContextMenuItemDef {
    pub id: String,
    pub label: String,
    pub separator: bool,
}

/// Shows a native OS popup context menu built from the given items.
///
/// Selection events are handled globally in lib.rs via `app.on_menu_event`,
/// which emits `context-menu-selected` to the frontend. This command only
/// builds the menu and calls popup_menu — no per-call listener is registered.
#[specta::specta]
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

    window
        .popup_menu(&menu)
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(())
}
