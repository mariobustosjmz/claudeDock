use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{ProcessRefreshKind, RefreshKind, System};
use tauri::AppHandle;

use super::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentMetrics {
    pub pid: u32,
    pub log_lines: Vec<String>,
    pub token_estimate: Option<u64>,
    pub cost_estimate: Option<f64>,
}

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
        .filter_map(|proc| classify_agent(proc, now))
        .collect();

    Ok(agents)
}

fn classify_agent(proc: &sysinfo::Process, _now: u64) -> Option<AgentProcess> {
    let name = proc.name().to_string_lossy().to_lowercase();
    let cmd: Vec<String> = proc
        .cmd()
        .iter()
        .map(|s| s.to_string_lossy().to_string())
        .collect();
    let cmd_str = cmd.join(" ").to_lowercase();

    let agent_type = if name.contains("claude") || cmd_str.contains("claude") {
        "Claude Code"
    } else if name.contains("cursor") {
        "Cursor"
    } else if cmd_str.contains("codex") {
        "Codex"
    } else if cmd_str.contains("aider") {
        "Aider"
    } else {
        return None;
    };

    if cmd_str.contains("devdock") || cmd_str.contains("tauri") {
        return None;
    }

    let cwd = proc.cwd().map(|p| p.to_string_lossy().to_string());
    let start_time = proc.start_time();
    let status = format!("{:?}", proc.status());

    Some(AgentProcess {
        pid: proc.pid().as_u32(),
        name: proc.name().to_string_lossy().to_string(),
        agent_type: agent_type.to_string(),
        cmd,
        cwd,
        memory_kb: proc.memory() / 1024,
        cpu_percent: proc.cpu_usage(),
        start_time,
        status,
    })
}

#[tauri::command]
pub async fn get_agent_metrics(
    _app: AppHandle,
    pid: u32,
) -> Result<AgentMetrics, AppError> {
    let log_lines = try_read_agent_logs(pid);
    let token_estimate = parse_token_count(&log_lines);
    let cost_estimate = parse_cost(&log_lines);

    Ok(AgentMetrics {
        pid,
        log_lines,
        token_estimate,
        cost_estimate,
    })
}

fn try_read_agent_logs(pid: u32) -> Vec<String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = vec![
        format!("{}/.claude/logs/claude-{}.log", home, pid),
        format!("{}/.config/claude/logs/{}.log", home, pid),
        format!("/tmp/claude-{}.log", pid),
        format!("{}/.cursor/logs/extension-host-{}.log", home, pid),
    ];

    for path in candidates {
        if let Ok(content) = std::fs::read_to_string(&path) {
            return content
                .lines()
                .rev()
                .take(50)
                .map(|s| s.to_string())
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect();
        }
    }
    vec![]
}

fn parse_token_count(lines: &[String]) -> Option<u64> {
    for line in lines.iter().rev() {
        if line.to_lowercase().contains("token") {
            let num: String = line
                .chars()
                .skip_while(|c| !c.is_ascii_digit())
                .take_while(|c| c.is_ascii_digit())
                .collect();
            if let Ok(n) = num.parse::<u64>() {
                return Some(n);
            }
        }
    }
    None
}

fn parse_cost(lines: &[String]) -> Option<f64> {
    for line in lines.iter().rev() {
        let lower = line.to_lowercase();
        if lower.contains("cost") || lower.contains('$') {
            let chars: Vec<char> = line.chars().collect();
            for i in 0..chars.len() {
                if chars[i] == '$' {
                    let num: String = chars[i + 1..]
                        .iter()
                        .take_while(|&&c| c.is_ascii_digit() || c == '.')
                        .collect();
                    if let Ok(cost) = num.parse::<f64>() {
                        return Some(cost);
                    }
                }
            }
        }
    }
    None
}
