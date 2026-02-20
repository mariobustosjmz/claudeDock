use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::UpdaterExt;
use crate::commands::AppError;

pub struct UpdaterEnabled(pub bool);

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub body: String,
}

pub struct PendingUpdate(pub Mutex<Option<tauri_plugin_updater::Update>>);

#[tauri::command]
pub async fn check_update(app: AppHandle) -> Result<Option<UpdateInfo>, AppError> {
    if !app.state::<UpdaterEnabled>().0 {
        return Ok(None);
    }
    let update = app
        .updater()
        .map_err(|e| AppError::Updater(e.to_string()))?
        .check()
        .await
        .map_err(|e| AppError::Updater(e.to_string()))?;

    if let Some(ref u) = update {
        let info = UpdateInfo {
            version: u.version.clone(),
            body: u.body.clone().unwrap_or_default(),
        };
        if let Some(state) = app.try_state::<PendingUpdate>() {
            *state.0.lock().map_err(|e| AppError::Updater(e.to_string()))? = update;
        }
        return Ok(Some(info));
    }

    Ok(None)
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), AppError> {
    let pending = app
        .try_state::<PendingUpdate>()
        .ok_or_else(|| AppError::Updater("No pending update in state".to_string()))?;

    let update = pending.0.lock()
        .map_err(|e| AppError::Updater(e.to_string()))?
        .take();

    if let Some(u) = update {
        u.download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| AppError::Updater(e.to_string()))?;
    }
    Ok(())
}
