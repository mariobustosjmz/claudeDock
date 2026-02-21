use serde::{Deserialize, Serialize};
use specta::Type;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{ProcessRefreshKind, RefreshKind, System};
use tauri::AppHandle;

use super::AppError;
use crate::services::process_service;

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
pub struct AgentProcess {
    pub pid: u32,
    pub name: String,
    pub agent_type: String,
    pub cmd: Vec<String>,
    pub cwd: Option<String>,
    pub memory_kb: u64,
    pub cpu_percent: f32,
    pub start_time: u64,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct AgentMetrics {
    pub pid: u32,
    pub log_lines: Vec<String>,
    pub token_estimate: Option<u64>,
    pub cost_estimate: Option<f64>,
    pub log_path: Option<String>,
    pub metrics_available: bool,
}

#[specta::specta]
#[tauri::command]
pub async fn get_running_agents(_app: AppHandle) -> Result<Vec<AgentProcess>, AppError> {
    let mut sys = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::everything()),
    );
    sys.refresh_all();

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let agents: Vec<AgentProcess> = sys
        .processes()
        .values()
        .filter_map(|proc| process_service::classify_agent(proc, now))
        .collect();

    Ok(agents)
}

#[specta::specta]
#[tauri::command]
pub async fn get_agent_metrics(
    _app: AppHandle,
    pid: u32,
) -> Result<AgentMetrics, AppError> {
    let (log_lines, log_path) = process_service::try_read_agent_logs(pid);
    let metrics_available = !log_lines.is_empty();
    let token_estimate = if metrics_available {
        process_service::parse_token_count_structured(&log_lines)
            .or_else(|| process_service::parse_token_count_heuristic(&log_lines))
    } else {
        None
    };
    let cost_estimate = if metrics_available {
        process_service::parse_cost_structured(&log_lines)
            .or_else(|| process_service::parse_cost_heuristic(&log_lines))
    } else {
        None
    };

    Ok(AgentMetrics {
        pid,
        log_lines,
        token_estimate,
        cost_estimate,
        log_path,
        metrics_available,
    })
}
