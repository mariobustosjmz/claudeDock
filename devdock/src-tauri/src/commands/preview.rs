use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use crate::commands::AppError;

#[tauri::command]
pub async fn open_preview_window(app: AppHandle, url: String) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window("preview") {
        window.close().map_err(|e| AppError::Window(e.to_string()))?;
    }

    let parsed: url::Url = url
        .parse()
        .map_err(|e: url::ParseError| AppError::Window(e.to_string()))?;

    let webview_url = WebviewUrl::External(parsed);

    WebviewWindowBuilder::new(&app, "preview", webview_url)
        .title("Preview")
        .inner_size(900.0, 700.0)
        .resizable(true)
        .focused(true)
        .build()
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn close_preview_window(app: AppHandle) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window("preview") {
        window.close().map_err(|e| AppError::Window(e.to_string()))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn inject_inspector(app: AppHandle, enable: bool) -> Result<(), AppError> {
    let window = app
        .get_webview_window("preview")
        .ok_or_else(|| AppError::Window("Preview window not open".to_string()))?;

    let script = if enable {
        r#"document.body.style.outline = "2px solid red";"#
    } else {
        r#"document.body.style.outline = "";"#
    };

    window
        .eval(script)
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub async fn apply_css_change(
    app: AppHandle,
    selector: String,
    property: String,
    value: String,
) -> Result<(), AppError> {
    let window = app
        .get_webview_window("preview")
        .ok_or_else(|| AppError::Window("Preview window not open".to_string()))?;

    for s in [&selector, &property, &value] {
        if s.contains('"') || s.contains('\'') || s.contains(';') || s.contains('<') || s.contains('>') {
            return Err(AppError::Window(
                "Invalid characters in CSS parameters".to_string(),
            ));
        }
    }

    let script = format!(
        r#"document.querySelectorAll("{selector}").forEach(function(el) {{ el.style["{property}"] = "{value}"; }});"#,
        selector = selector,
        property = property,
        value = value
    );

    window
        .eval(&script)
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(())
}
