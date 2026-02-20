use base64::{engine::general_purpose, Engine as _};
use image::{ImageBuffer, Rgba};
use screenshots::Screen;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use super::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct CaptureResult {
    pub image_base64: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
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

#[tauri::command]
pub async fn capture_region(
    _app: AppHandle,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<CaptureResult, AppError> {
    let screens = Screen::all().map_err(|e| AppError::Screenshot(e.to_string()))?;

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

#[tauri::command]
pub async fn open_screenshot_overlay(app: AppHandle) -> Result<(), AppError> {
    if let Some(existing) = app.get_webview_window("screenshot-overlay") {
        existing
            .close()
            .map_err(|e| AppError::Screenshot(e.to_string()))?;
        std::thread::sleep(std::time::Duration::from_millis(100));
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
