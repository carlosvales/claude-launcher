use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

const EXCLUDED_DIRS: &[&str] = &[
    "claude-launcher",
    "ai_backend",
    ".git",
    "__pycache__",
    "node_modules",
    ".venv",
    "venv",
    "src-tauri",
    "target",
    "dist",
    "build",
    "tauri",
];

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    name: String,
    path: String,
    last_session_iso: Option<String>,
    last_session_label: String,
    last_session_color: String,
    has_session: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LaunchOptions {
    session: String,
    skip_perms: bool,
    voice: bool,
    model: String,
    effort: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DefaultOptions {
    session: String,
    skip_perms: bool,
    voice: bool,
    model: String,
    effort: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectPrefs {
    session: String,
    skip_perms: bool,
    voice: bool,
    model: String,
    effort: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    projects_dir: String,
    default_options: DefaultOptions,
    last_project: String,
    projects: serde_json::Map<String, serde_json::Value>,
}

fn home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("."))
}

fn expand_path(s: &str) -> PathBuf {
    if s == "~" {
        return home_dir();
    }
    if let Some(rest) = s.strip_prefix("~/").or_else(|| s.strip_prefix("~\\")) {
        return home_dir().join(rest);
    }
    PathBuf::from(s)
}

fn app_config_dir() -> PathBuf {
    let dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    let app_dir = dir.join("claudelauncher");
    let _ = fs::create_dir_all(&app_dir);
    app_dir
}

fn config_file() -> PathBuf {
    app_config_dir().join("config.json")
}

fn default_config() -> Config {
    Config {
        projects_dir: home_dir()
            .join("Documents")
            .join("Code")
            .to_string_lossy()
            .to_string(),
        default_options: DefaultOptions {
            session: "continue".into(),
            skip_perms: true,
            voice: false,
            model: "opus".into(),
            effort: "max".into(),
        },
        last_project: String::new(),
        projects: serde_json::Map::new(),
    }
}

fn claude_sessions_dir(project_path: &str) -> PathBuf {
    let raw = project_path
        .replace('\\', "-")
        .replace('/', "-")
        .replace(':', "-")
        .replace(' ', "-");
    home_dir().join(".claude").join("projects").join(raw)
}

fn last_session_info(project_path: &str) -> (Option<DateTime<Local>>, String, String, bool) {
    let dir = claude_sessions_dir(project_path);
    let modified = match fs::metadata(&dir).and_then(|m| m.modified()) {
        Ok(t) => t,
        Err(_) => return (None, "no sessions".into(), "#666".into(), false),
    };
    let dt: DateTime<Local> = modified.into();
    let now = Local::now();
    let days = now.signed_duration_since(dt).num_days();
    let (label, color) = if days <= 0 {
        ("today".into(), "#4ECDC4".into())
    } else if days == 1 {
        ("yesterday".into(), "#4ECDC4".into())
    } else if days < 7 {
        (format!("{}d ago", days), "#82E0AA".into())
    } else if days < 30 {
        (format!("{}w ago", days / 7), "#F8C471".into())
    } else {
        (dt.format("%d/%m/%y").to_string(), "#888".into())
    };
    (Some(dt), label, color, true)
}

#[tauri::command]
fn scan_projects(projects_dir: String) -> Result<Vec<Project>, String> {
    let root = expand_path(&projects_dir);
    if !root.exists() {
        return Ok(vec![]);
    }
    let entries = fs::read_dir(&root).map_err(|e| e.to_string())?;
    let mut projects: Vec<Project> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            e.path().is_dir() && !EXCLUDED_DIRS.contains(&name.as_str()) && !name.starts_with('.')
        })
        .map(|e| {
            let path_str = e.path().to_string_lossy().to_string();
            let name = e.file_name().to_string_lossy().to_string();
            let (iso, label, color, has) = last_session_info(&path_str);
            Project {
                name,
                path: path_str,
                last_session_iso: iso.map(|d| d.to_rfc3339()),
                last_session_label: label,
                last_session_color: color,
                has_session: has,
            }
        })
        .collect();

    projects.sort_by(|a, b| match (a.has_session, b.has_session) {
        (true, true) => b.last_session_iso.cmp(&a.last_session_iso),
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        (false, false) => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(projects)
}

#[tauri::command]
fn launch_claude(project_path: String, options: LaunchOptions) -> Result<(), String> {
    let mut parts: Vec<String> = vec!["claude".to_string()];
    match options.session.as_str() {
        "continue" => parts.push("--continue".into()),
        "resume" => parts.push("--resume".into()),
        _ => {}
    }
    if options.skip_perms {
        parts.push("--dangerously-skip-permissions".into());
    }
    parts.push("--model".into());
    parts.push(options.model);
    parts.push("--effort".into());
    parts.push(options.effort);
    let claude_cmd = parts.join(" ");

    #[cfg(target_os = "windows")]
    {
        let escaped = project_path.replace('/', "\\");
        // Try Windows Terminal first (best experience), then fall back to
        // PowerShell or cmd.exe for systems where wt is not installed
        // (Windows 10 without WT, Windows Server, enterprise lockdowns).
        let launched = Command::new("wt")
            .args(["-d", &escaped, "cmd", "/k", &claude_cmd])
            .spawn()
            .or_else(|_| {
                let ps_script = format!(
                    "Set-Location -LiteralPath '{}'; {}",
                    escaped, claude_cmd
                );
                Command::new("powershell")
                    .args(["-NoExit", "-Command", &ps_script])
                    .spawn()
            })
            .or_else(|_| {
                let cmd_line = format!("cd /d \"{}\" && {}", escaped, claude_cmd);
                Command::new("cmd")
                    .args(["/k", &cmd_line])
                    .spawn()
            })
            .map_err(|e| format!("Failed to launch terminal: {e}"))?;
        drop(launched);
    }
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "tell application \"Terminal\" to do script \"cd '{}' && {}\"",
            project_path, claude_cmd
        );
        Command::new("osascript")
            .args(["-e", &script])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        let inner = format!("{}; exec bash", claude_cmd);
        let _ = Command::new("gnome-terminal")
            .args(["--working-directory", &project_path, "--", "bash", "-c", &inner])
            .spawn()
            .or_else(|_| {
                Command::new("konsole")
                    .args(["--workdir", &project_path, "-e", "bash", "-c", &inner])
                    .spawn()
            })
            .or_else(|_| {
                Command::new("xterm")
                    .args(["-e", &format!("cd '{}' && {}", project_path, inner)])
                    .spawn()
            })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn load_config() -> Result<Config, String> {
    let path = config_file();
    if !path.exists() {
        let cfg = default_config();
        let json = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
        fs::write(&path, json).map_err(|e| e.to_string())?;
        return Ok(cfg);
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| {
        format!("Invalid config.json: {}. Delete {} to reset to defaults.", e, path.display())
    })
}

#[tauri::command]
fn save_config(config: Config) -> Result<(), String> {
    let path = config_file();
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn config_file_path() -> Result<String, String> {
    Ok(config_file().to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_projects,
            launch_claude,
            open_folder,
            load_config,
            save_config,
            config_file_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expand_path_absolute_unchanged() {
        assert_eq!(expand_path("/abs/path"), PathBuf::from("/abs/path"));
        assert_eq!(expand_path("relative"), PathBuf::from("relative"));
    }

    #[test]
    fn expand_path_tilde_only_returns_home() {
        assert_eq!(expand_path("~"), home_dir());
    }

    #[test]
    fn expand_path_tilde_slash_resolves() {
        let expanded = expand_path("~/Documents");
        assert_eq!(expanded, home_dir().join("Documents"));
    }

    #[test]
    fn expand_path_tilde_backslash_resolves() {
        let expanded = expand_path("~\\Documents");
        assert_eq!(expanded, home_dir().join("Documents"));
    }

    #[test]
    fn claude_sessions_dir_replaces_separators() {
        let result = claude_sessions_dir("C:\\Users\\carlos\\my project");
        let expected = home_dir()
            .join(".claude")
            .join("projects")
            .join("C--Users-carlos-my-project");
        assert_eq!(result, expected);
    }

    #[test]
    fn claude_sessions_dir_handles_forward_slashes() {
        let result = claude_sessions_dir("/home/user/code");
        let expected = home_dir()
            .join(".claude")
            .join("projects")
            .join("-home-user-code");
        assert_eq!(result, expected);
    }

    #[test]
    fn default_config_has_sane_defaults() {
        let cfg = default_config();
        assert_eq!(cfg.default_options.session, "continue");
        assert_eq!(cfg.default_options.model, "opus");
        assert_eq!(cfg.default_options.effort, "max");
        assert!(cfg.default_options.skip_perms);
        assert!(cfg.last_project.is_empty());
        assert!(cfg.projects.is_empty());
    }

    #[test]
    fn last_session_info_returns_empty_for_missing_path() {
        let (iso, label, _color, has) = last_session_info("/nonexistent/path/should/not/exist");
        assert!(iso.is_none());
        assert_eq!(label, "no sessions");
        assert!(!has);
    }
}
