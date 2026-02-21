use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use crate::commands::AppError;

#[specta::specta]
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

#[specta::specta]
#[tauri::command]
pub async fn close_preview_window(app: AppHandle) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window("preview") {
        window.close().map_err(|e| AppError::Window(e.to_string()))?;
    }
    Ok(())
}

#[specta::specta]
#[tauri::command]
pub async fn inject_inspector(app: AppHandle, enable: bool) -> Result<(), AppError> {
    let window = app
        .get_webview_window("preview")
        .ok_or_else(|| AppError::Window("Preview window not open".to_string()))?;

    let script = if enable {
        r#"
(function() {
  if (window.__devdockInspectorActive) return;
  window.__devdockInspectorActive = true;
  var highlighted = null;
  var overlay = document.createElement('div');
  overlay.id = '__devdock_overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #7c3aed;background:rgba(124,58,237,0.08);z-index:2147483647;transition:all 0.1s;border-radius:2px;';
  document.body.appendChild(overlay);

  function getCssSelector(el) {
    if (!el || el === document.body) return 'body';
    if (el.id) return '#' + el.id;
    var cls = Array.from(el.classList).slice(0,2).join('.');
    return (cls ? el.tagName.toLowerCase() + '.' + cls : el.tagName.toLowerCase());
  }

  function onMouseOver(e) {
    var el = e.target;
    if (el === overlay) return;
    highlighted = el;
    var r = el.getBoundingClientRect();
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
  }

  function onClick(e) {
    if (!highlighted) return;
    e.preventDefault();
    e.stopPropagation();
    var sel = getCssSelector(highlighted);
    var cs = window.getComputedStyle(highlighted);
    var props = ['color','background-color','font-size','font-weight','padding','margin','border-radius','width','height'];
    var result = {selector: sel, properties: {}};
    props.forEach(function(p){ result.properties[p] = cs.getPropertyValue(p); });
    window.__devdockLastInspected = result;
    overlay.style.borderColor = '#10b981';
    setTimeout(function(){ overlay.style.borderColor = '#7c3aed'; }, 400);
  }

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('click', onClick, true);
  window.__devdockCleanupInspector = function() {
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('click', onClick, true);
    overlay.remove();
    window.__devdockInspectorActive = false;
    window.__devdockCleanupInspector = null;
  };
})();
        "#
    } else {
        r#"
if (typeof window.__devdockCleanupInspector === 'function') {
  window.__devdockCleanupInspector();
}
        "#
    };

    window
        .eval(script)
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub async fn get_inspected_element(app: AppHandle) -> Result<Option<serde_json::Value>, AppError> {
    let window = app
        .get_webview_window("preview")
        .ok_or_else(|| AppError::Window("Preview window not open".to_string()))?;

    let result = window
        .eval("JSON.stringify(window.__devdockLastInspected || null)")
        .map_err(|e| AppError::Window(e.to_string()))?;

    let _ = result;
    Ok(None)
}

#[specta::specta]
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
