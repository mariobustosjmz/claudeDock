use sysinfo::Process;

use crate::commands::process::AgentProcess;

pub fn classify_agent(proc: &Process, _now: u64) -> Option<AgentProcess> {
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

pub fn try_read_agent_logs(pid: u32) -> (Vec<String>, Option<String>) {
    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = vec![
        format!("{}/.claude/logs/claude-{}.log", home, pid),
        format!("{}/.config/claude/logs/{}.log", home, pid),
        // Claude Code stores JSONL session logs here
        format!("{}/.claude/projects/current/session.jsonl", home),
        format!("{}/.claude/session.jsonl", home),
        format!("/tmp/claude-{}.log", pid),
        format!("/tmp/claude-code-{}.jsonl", pid),
        format!("{}/.cursor/logs/extension-host-{}.log", home, pid),
        format!("{}/.aider.log", home),
    ];

    for path in candidates {
        if let Ok(content) = std::fs::read_to_string(&path) {
            let lines: Vec<String> = content
                .lines()
                .rev()
                .take(100)
                .map(|s| s.to_string())
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect();
            if !lines.is_empty() {
                return (lines, Some(path));
            }
        }
    }
    (vec![], None)
}

pub fn parse_token_count_structured(lines: &[String]) -> Option<u64> {
    for line in lines.iter().rev() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            // Claude API standard format
            if let Some(tokens) = json
                .get("usage")
                .and_then(|u| u.get("total_tokens"))
                .and_then(|t| t.as_u64())
            {
                return Some(tokens);
            }
            // Claude Code JSONL session format: input_tokens + output_tokens
            if let Some(usage) = json.get("usage") {
                let input = usage.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
                let output = usage.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0);
                if input + output > 0 {
                    return Some(input + output);
                }
            }
            // Flat tokens field
            if let Some(tokens) = json.get("tokens").and_then(|t| t.as_u64()) {
                return Some(tokens);
            }
            // Aider format: total_cost entry with token fields
            if let Some(tokens) = json
                .get("token_count")
                .and_then(|t| t.as_u64())
            {
                return Some(tokens);
            }
        }
    }
    None
}

pub fn parse_cost_structured(lines: &[String]) -> Option<f64> {
    for line in lines.iter().rev() {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            if let Some(cost) = json.get("cost").and_then(|c| c.as_f64()) {
                if cost > 0.0 {
                    return Some(cost);
                }
            }
        }
    }
    None
}

pub fn parse_token_count_heuristic(lines: &[String]) -> Option<u64> {
    for line in lines.iter().rev() {
        let lower = line.to_lowercase();
        if lower.contains("token") && (lower.contains("total") || lower.contains("used")) {
            let num: String = line
                .chars()
                .skip_while(|c| !c.is_ascii_digit())
                .take_while(|c| c.is_ascii_digit() || *c == '_' || *c == ',')
                .filter(|c| c.is_ascii_digit())
                .collect();
            if let Ok(n) = num.parse::<u64>() {
                if n > 0 && n < 10_000_000 {
                    return Some(n);
                }
            }
        }
    }
    None
}

pub fn parse_cost_heuristic(lines: &[String]) -> Option<f64> {
    for line in lines.iter().rev() {
        let lower = line.to_lowercase();
        if lower.contains("cost") && lower.contains('$') {
            let chars: Vec<char> = line.chars().collect();
            for i in 0..chars.len().saturating_sub(1) {
                if chars[i] == '$' {
                    let num: String = chars[i + 1..]
                        .iter()
                        .take_while(|&&c| c.is_ascii_digit() || c == '.')
                        .collect();
                    if let Ok(cost) = num.parse::<f64>() {
                        if cost > 0.0 && cost < 1000.0 {
                            return Some(cost);
                        }
                    }
                }
            }
        }
    }
    None
}
