use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;

use super::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectContext {
    pub git_root: Option<String>,
    pub project_name: Option<String>,
    pub package_json: Option<PackageInfo>,
    pub recent_commits: Vec<String>,
    pub current_branch: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageInfo {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub main_dependencies: Vec<String>,
}

#[tauri::command]
pub async fn get_project_context(
    _app: AppHandle,
    path: Option<String>,
) -> Result<ProjectContext, AppError> {
    let start_path = path
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    let git_root = find_git_root(&start_path);

    let (package_json, project_name) = if let Some(ref root) = git_root {
        let pkg_path = PathBuf::from(root).join("package.json");
        let pkg = read_package_json(&pkg_path);
        let name = pkg.as_ref().map(|p| p.name.clone());
        (pkg, name)
    } else {
        (None, None)
    };

    let (recent_commits, current_branch) = if let Some(ref root) = git_root {
        (get_recent_commits(root), get_current_branch(root))
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

fn find_git_root(start: &PathBuf) -> Option<String> {
    let output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(start)
        .output()
        .ok()?;

    if output.status.success() {
        String::from_utf8(output.stdout)
            .ok()
            .map(|s| s.trim().to_string())
    } else {
        None
    }
}

fn read_package_json(path: &PathBuf) -> Option<PackageInfo> {
    let content = std::fs::read_to_string(path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;

    let name = json["name"].as_str()?.to_string();
    let version = json["version"].as_str().unwrap_or("0.0.0").to_string();
    let description = json["description"].as_str().map(|s| s.to_string());

    let mut deps: Vec<String> = vec![];
    if let Some(d) = json["dependencies"].as_object() {
        deps.extend(d.keys().take(10).cloned());
    }
    if let Some(d) = json["devDependencies"].as_object() {
        deps.extend(d.keys().take(5).cloned());
    }

    Some(PackageInfo {
        name,
        version,
        description,
        main_dependencies: deps,
    })
}

fn get_recent_commits(git_root: &str) -> Vec<String> {
    Command::new("git")
        .args(["log", "--oneline", "-5"])
        .current_dir(git_root)
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.lines().map(|l| l.to_string()).collect())
        .unwrap_or_default()
}

fn get_current_branch(git_root: &str) -> Option<String> {
    let output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(git_root)
        .output()
        .ok()?;

    String::from_utf8(output.stdout)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}
