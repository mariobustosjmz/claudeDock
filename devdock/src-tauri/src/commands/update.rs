use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;
use crate::commands::AppError;

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub body: String,
}

#[tauri::command]
pub async fn check_update(app: AppHandle) -> Result<Option<UpdateInfo>, AppError> {
    let update = app
        .updater()
        .map_err(|e| AppError::Window(e.to_string()))?
        .check()
        .await
        .map_err(|e| AppError::Window(e.to_string()))?;

    Ok(update.map(|u| UpdateInfo {
        version: u.version.clone(),
        body: u.body.clone().unwrap_or_default(),
    }))
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), AppError> {
    let update = app
        .updater()
        .map_err(|e| AppError::Window(e.to_string()))?
        .check()
        .await
        .map_err(|e| AppError::Window(e.to_string()))?;

    if let Some(u) = update {
        u.download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| AppError::Window(e.to_string()))?;
    }
    Ok(())
}
