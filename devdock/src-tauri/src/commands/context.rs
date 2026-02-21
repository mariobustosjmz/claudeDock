use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;
use tauri::AppHandle;

use super::AppError;
use crate::services::context_service;

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct ProjectContext {
    pub git_root: Option<String>,
    pub project_name: Option<String>,
    pub package_json: Option<PackageInfo>,
    pub recent_commits: Vec<String>,
    pub current_branch: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct PackageInfo {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub main_dependencies: Vec<String>,
}

#[specta::specta]
#[tauri::command]
pub async fn get_project_context(
    _app: AppHandle,
    path: Option<String>,
) -> Result<ProjectContext, AppError> {
    let start_path = match path {
        Some(p) => PathBuf::from(p),
        None => std::env::current_dir()
            .map_err(|e| AppError::Io(e.to_string()))?,
    };

    let git_root = context_service::find_git_root(&start_path);

    let (package_json, project_name) = if let Some(ref root) = git_root {
        let pkg_path = PathBuf::from(root).join("package.json");
        let pkg = context_service::read_package_json(&pkg_path);
        let name = pkg.as_ref().map(|p| p.name.clone());
        (pkg, name)
    } else {
        (None, None)
    };

    let (recent_commits, current_branch) = if let Some(ref root) = git_root {
        (
            context_service::get_recent_commits(root),
            context_service::get_current_branch(root),
        )
    } else {
        (vec![], None)
    };

    Ok(ProjectContext {
        git_root,
        project_name,
        package_json,
        recent_commits,
        current_branch,
    })
}
