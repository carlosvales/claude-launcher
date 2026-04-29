import { useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import "./App.css";
import { api } from "./api";
import { ProjectCard } from "./components/ProjectCard";
import { SidePanel } from "./components/SidePanel";
import { SettingsModal } from "./components/SettingsModal";
import { HelpModal } from "./components/HelpModal";
import { clsx } from "./utils";
import type { Config, LaunchOptions, Project } from "./types";

const DEFAULT_OPTIONS: LaunchOptions = {
  session: "continue",
  skipPerms: true,
  voice: false,
  model: "opus",
  effort: "max",
};

type StatusColor = "dim" | "accent" | "error";
const STATUS_CLS: Record<StatusColor, string> = {
  dim:    "text-dim",
  accent: "text-accent",
  error:  "text-red-500",
};

export default function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [configPath, setConfigPath] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [options, setOptions] = useState<LaunchOptions>(DEFAULT_OPTIONS);
  const [status, setStatus] = useState<{ text: string; color: StatusColor }>({
    text: "Double click to launch · Enter to open · Esc to deselect",
    color: "dim",
  });
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.loadConfig();
        const cfgPath = await api.configFilePath();
        setConfig(cfg);
        setConfigPath(cfgPath);
        setOptions(cfg.defaultOptions);
        const list = await api.scanProjects(cfg.projectsDir);
        setProjects(list);
        if (cfg.lastProject) {
          const last = list.find((p) => p.name === cfg.lastProject);
          if (last) { setSelected(last.path); applyProjectPrefs(cfg, last.name); }
        }
        if (list.length === 0) {
          setSettingsOpen(true);
          setStatus({ text: "No projects found. Pick your code folder in Settings.", color: "accent" });
        }
      } catch (err) {
        setStatus({ text: `Error: ${err}`, color: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function applyProjectPrefs(cfg: Config, name: string) {
    setOptions(cfg.projects[name] ?? cfg.defaultOptions);
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (settingsOpen || helpOpen) return;
      if (e.key === "Enter" && selected) { e.preventDefault(); launch(); }
      else if (e.key === "Escape") { setSelected(null); if (config) setOptions(config.defaultOptions); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const filtered = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())),
    [projects, filter],
  );

  const selectedProject = projects.find((p) => p.path === selected) ?? null;

  function selectProject(project: Project) {
    setSelected(project.path);
    if (config) applyProjectPrefs(config, project.name);
  }

  async function launch() {
    if (!selectedProject || !config) return;
    try {
      await api.launchClaude(selectedProject.path, options);
      const next: Config = {
        ...config,
        lastProject: selectedProject.name,
        projects: { ...config.projects, [selectedProject.name]: { ...options } },
      };
      setConfig(next);
      await api.saveConfig(next);
      setStatus({ text: `Launched ${selectedProject.name} · ${options.model}`, color: "accent" });
    } catch (err) {
      setStatus({ text: `Launch error: ${err}`, color: "error" });
    }
  }

  async function openFolder() {
    if (!selectedProject) return;
    try { await api.openFolder(selectedProject.path); }
    catch (err) { setStatus({ text: `Open folder error: ${err}`, color: "error" }); }
  }

  async function rescan(cfg: Config = config!) {
    setStatus({ text: "Scanning…", color: "dim" });
    try {
      const list = await api.scanProjects(cfg.projectsDir);
      setProjects(list);
      setStatus({ text: `Found ${list.length} projects`, color: "accent" });
    } catch (err) {
      setStatus({ text: `Scan error: ${err}`, color: "error" });
    }
  }

  async function pickFolder(): Promise<string | null> {
    try {
      const result = await openDialog({ directory: true, multiple: false, title: "Pick your code folder" });
      return typeof result === "string" ? result : null;
    } catch { return null; }
  }

  async function saveSettings(next: Config) {
    setConfig(next);
    setOptions(next.defaultOptions);
    await api.saveConfig(next);
    await rescan(next);
  }

  return (
    <main className="h-screen flex flex-col bg-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-accent text-white">
            C
          </div>
          <span className="text-sm font-semibold text-text">Claude Launcher</span>
        </div>
        <div className="flex gap-1.5">
          {[
            { label: "Rescan", action: () => rescan() },
            { label: "Settings", action: () => setSettingsOpen(true) },
            { label: "?", action: () => setHelpOpen(true), title: "Help" },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              title={btn.title}
              className="h-7 px-3 rounded-lg text-xs font-medium bg-surface-2 text-muted border border-border hover:bg-surface-3 hover:text-text transition-colors"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </header>

      {/* Search */}
      <div className="px-5 py-3 border-b border-border">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search projects…"
          className="w-full h-9 px-3 rounded-lg text-sm bg-surface border border-border text-text placeholder:text-dim focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        <section className="flex-1 flex flex-col min-w-0 p-5 gap-3">
          <div className="text-xs text-dim">
            {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "project" : "projects"}`}
          </div>

          {!loading && projects.length === 0 && config && (
            <div className="rounded-lg px-3 py-2 text-xs mb-1 bg-accent/10 border border-accent/25 text-accent">
              No projects found in <code>{config.projectsDir}</code>.{" "}
              <button onClick={() => setSettingsOpen(true)} className="underline font-medium">
                Pick a different folder
              </button>
              .
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {filtered.map((p, i) => (
                <div key={p.path} className="card-enter" style={{ animationDelay: `${Math.min(i * 20, 500)}ms` }}>
                  <ProjectCard
                    project={p}
                    selected={p.path === selected}
                    onSelect={() => selectProject(p)}
                    onDoubleClick={() => { selectProject(p); setTimeout(launch, 0); }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-l border-border">
          <SidePanel
            project={selectedProject}
            options={options}
            onChangeOptions={setOptions}
            onLaunch={launch}
            onOpenFolder={openFolder}
          />
        </div>
      </div>

      {/* Status bar */}
      <footer className={clsx("px-5 h-8 flex items-center text-xs border-t border-border", STATUS_CLS[status.color])}>
        {status.text}
      </footer>

      {config && (
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={config}
          onSave={saveSettings}
          onPickFolder={pickFolder}
        />
      )}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} configPath={configPath} />
    </main>
  );
}
