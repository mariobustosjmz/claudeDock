use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_opener::OpenerExt;
use crate::commands::AppError;

#[tauri::command]
pub async fn execute_shell(app: AppHandle, command: String) -> Result<String, AppError> {
    let shell = app.shell();
    let parts: Vec<&str> = command.splitn(2, ' ').collect();
    let (cmd, args): (&str, Vec<String>) = if parts.len() == 2 {
        (parts[0], parts[1].split_whitespace().map(String::from).collect())
    } else {
        (parts[0], vec![])
    };

    let output = shell
        .command(cmd)
        .args(args)
        .output()
        .await
        .map_err(|e| AppError::Shell(e.to_string()))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(AppError::Shell(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }
}

#[tauri::command]
pub async fn open_url(app: AppHandle, url: String) -> Result<(), AppError> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| AppError::Shell(e.to_string()))
}
