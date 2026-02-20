pub mod commands;
pub mod services;

use commands::audio::RecordingState;
use commands::context::get_project_context;
use commands::process::{get_agent_metrics, get_running_agents};
use commands::screenshot::{capture_region, close_screenshot_overlay, copy_image_to_clipboard, get_screen_info, open_screenshot_overlay};
use commands::preview::{apply_css_change, close_preview_window, inject_inspector, open_preview_window};
use commands::snapshot::{get_open_windows, restore_snapshot, save_snapshot};
use commands::shell::{execute_shell, open_url};
use commands::update::{check_update, install_update, PendingUpdate, UpdaterEnabled};
use commands::window::{
    get_dock_position, set_always_on_top, set_dock_position, toggle_dock_visibility,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

#[cfg(target_os = "macos")]
use tauri_nspanel::WebviewWindowExt as NsPanelExt;
#[cfg(target_os = "macos")]
#[allow(deprecated)]
use tauri_nspanel::cocoa::appkit::NSWindowCollectionBehavior;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(RecordingState::default())
        .manage(PendingUpdate(std::sync::Mutex::new(None)))
        .manage(UpdaterEnabled(false)) // set to true when updater plugin is registered
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_mcp_bridge::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        // updater disabled in dev — enable with a real signing key before release
        // .plugin(tauri_plugin_updater::Builder::new().build())
        // .plugin(tauri_plugin_nosleep::init())  — disabled: panics on macOS 15
        .plugin(tauri_plugin_prevent_default::Builder::new().build())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            #[allow(deprecated)]
            {
                app.handle().plugin(tauri_plugin_macos_permissions::init())?;
                app.handle().plugin(tauri_nspanel::init())?;

                let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);

                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(panel) = window.to_panel() {
                        // NSFloatingWindowLevel = 5
                        panel.set_level(5);
                        // NSNonactivatingPanelMask = 128 (1 << 7)
                        panel.set_style_mask(128);
                        // CanJoinAllSpaces: visible across all Spaces
                        // FullScreenAuxiliary: remains visible when another app goes full-screen
                        // Note: MoveToActiveSpace conflicts with CanJoinAllSpaces — do not combine
                        panel.set_collection_behaviour(
                            NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                                | NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces,
                        );
                        panel.set_hides_on_deactivate(false);
                    }
                }
            }

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
            .or_else(|_| Image::from_bytes(include_bytes!("../icons/32x32.png")))
            .map_err(|e| {
                log::error!("failed to load tray icon: {e}");
                e
            })?;

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
            commands::audio::validate_microphone,
            commands::audio::start_recording,
            commands::audio::stop_recording,
            get_running_agents,
            get_agent_metrics,
            open_preview_window,
            close_preview_window,
            inject_inspector,
            apply_css_change,
            get_open_windows,
            save_snapshot,
            restore_snapshot,
            copy_image_to_clipboard,
            check_update,
            install_update,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| log::error!("tauri application error: {e}"));
}
