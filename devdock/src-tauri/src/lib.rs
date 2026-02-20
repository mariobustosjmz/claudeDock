pub mod commands;
pub mod services;

use commands::audio::RecordingState;
use commands::context::get_project_context;
use commands::screenshot::{capture_region, close_screenshot_overlay, get_screen_info, open_screenshot_overlay};
use commands::shell::{execute_shell, open_url};
use commands::window::{
    get_dock_position, set_always_on_top, set_dock_position, toggle_dock_visibility,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(RecordingState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let toggle_item = MenuItem::with_id(app, "toggle", "Show / Hide Dock", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit DevDock", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&toggle_item, &settings_item, &quit_item])?;

            let icon = Image::from_path(
                app.path()
                    .resource_dir()
                    .unwrap_or_default()
                    .join("icons/32x32.png"),
            )
            .unwrap_or_else(|_| {
                Image::from_bytes(include_bytes!("../icons/32x32.png"))
                    .expect("failed to load tray icon")
            });

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("open-settings", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_dock_position,
            get_dock_position,
            toggle_dock_visibility,
            set_always_on_top,
            execute_shell,
            open_url,
            capture_region,
            get_screen_info,
            open_screenshot_overlay,
            close_screenshot_overlay,
            get_project_context,
            commands::audio::start_recording,
            commands::audio::stop_recording,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
