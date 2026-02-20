use std::path::PathBuf;
use std::process::Command;

use crate::commands::context::PackageInfo;

pub fn find_git_root(start: &PathBuf) -> Option<String> {
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

pub fn read_package_json(path: &PathBuf) -> Option<PackageInfo> {
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

pub fn get_recent_commits(git_root: &str) -> Vec<String> {
    Command::new("git")
        .args(["log", "--oneline", "-5"])
        .current_dir(git_root)
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.lines().map(|l| l.to_string()).collect())
        .unwrap_or_default()
}

pub fn get_current_branch(git_root: &str) -> Option<String> {
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
