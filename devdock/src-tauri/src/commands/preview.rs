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

    if !matches!(parsed.scheme(), "http" | "https") {
        return Err(AppError::Window(
            "Only http and https URLs are allowed".to_string(),
        ));
    }

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

    let sel_json = serde_json::to_string(&selector)
        .map_err(|e| AppError::Window(e.to_string()))?;
    let prop_json = serde_json::to_string(&property)
        .map_err(|e| AppError::Window(e.to_string()))?;
    let val_json = serde_json::to_string(&value)
        .map_err(|e| AppError::Window(e.to_string()))?;

    let script = format!(
        "document.querySelectorAll({sel}).forEach(function(el){{ el.style[{prop}] = {val}; }});",
        sel = sel_json,
        prop = prop_json,
        val = val_json,
    );

    window
        .eval(&script)
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(())
}
