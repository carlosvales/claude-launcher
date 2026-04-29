import { useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import "./App.css";
import { api } from "./api";
import { ProjectCard } from "./components/ProjectCard";
import { SidePanel } from "./components/SidePanel";
import { SettingsModal } from "./components/SettingsModal";
import { HelpModal } from "./components/HelpModal";
import type { Config, LaunchOptions, Project } from "./types";

const DEFAULT_OPTIONS: LaunchOptions = {
  session: "continue",
  skipPerms: true,
  voice: false,
  model: "opus",
  effort: "max",
};

export default function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [configPath, setConfigPath] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [options, setOptions] = useState<LaunchOptions>(DEFAULT_OPTIONS);
  const [status, setStatus] = useState({
    text: "Double click to launch • Enter to open • Esc to deselect",
    color: "#71717a",
  });
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Initial load
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
          if (last) {
            setSelected(last.path);
            applyProjectPrefs(cfg, last.name);
          }
        }
        // Onboarding: if no projects found, open Settings
        if (list.length === 0) {
          setSettingsOpen(true);
          setStatus({
            text: "No projects found. Pick your code folder in Settings.",
            color: "#F8C471",
          });
        }
      } catch (err) {
        setStatus({ text: `Error: ${err}`, color: "#ef4444" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function applyProjectPrefs(cfg: Config, name: string) {
    const saved = cfg.projects[name];
    setOptions(saved ?? cfg.defaultOptions);
  }

  // Keyboard shortcuts (only when no modal is open)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (settingsOpen || helpOpen) return;
      if (e.key === "Enter" && selected) {
        e.preventDefault();
        launch();
      } else if (e.key === "Escape") {
        setSelected(null);
        if (config) setOptions(config.defaultOptions);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const filtered = useMemo(
    () =>
      projects.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())),
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
        projects: {
          ...config.projects,
          [selectedProject.name]: { ...options },
        },
      };
      setConfig(next);
      await api.saveConfig(next);
      setStatus({
        text: `Launched ${selectedProject.name} (${options.model})`,
        color: "#4ECDC4",
      });
    } catch (err) {
      setStatus({ text: `Launch error: ${err}`, color: "#ef4444" });
    }
  }

  async function openFolder() {
    if (!selectedProject) return;
    try {
      await api.openFolder(selectedProject.path);
    } catch (err) {
      setStatus({ text: `Open folder error: ${err}`, color: "#ef4444" });
    }
  }

  async function rescan(cfg: Config = config!) {
    setStatus({ text: "Scanning…", color: "#F8C471" });
    try {
      const list = await api.scanProjects(cfg.projectsDir);
      setProjects(list);
      setStatus({ text: `Found ${list.length} projects`, color: "#4ECDC4" });
    } catch (err) {
      setStatus({ text: `Scan error: ${err}`, color: "#ef4444" });
    }
  }

  async function pickFolder(): Promise<string | null> {
    try {
      const result = await openDialog({
        directory: true,
        multiple: false,
        title: "Pick your code folder",
      });
      if (typeof result === "string") return result;
      return null;
    } catch {
      return null;
    }
  }

  async function saveSettings(next: Config) {
    setConfig(next);
    setOptions(next.defaultOptions);
    await api.saveConfig(next);
    await rescan(next);
  }

  return (
    <main className="h-screen flex flex-col p-5 gap-3">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Claude Launcher
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => rescan()}
            className="h-8 px-3 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            Rescan
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="h-8 px-3 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            aria-label="Settings"
          >
            Settings
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="h-8 w-8 rounded-md text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            aria-label="Help"
            title="Help"
          >
            ?
          </button>
        </div>
      </header>

      {/* Search */}
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search projects…"
        className="h-9 px-3 rounded-md bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
      />

      {/* Body: grid + side panel */}
      <div className="flex-1 flex gap-4 min-h-0">
        <section className="flex-1 flex flex-col min-w-0">
          <div className="text-xs text-zinc-500 mb-2">
            {loading
              ? "Loading…"
              : `${filtered.length} ${filtered.length === 1 ? "project" : "projects"}`}
          </div>

          {!loading && projects.length === 0 && config && (
            <div className="rounded-md border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200 mb-2">
              No projects found in <code>{config.projectsDir}</code>.{" "}
              <button
                onClick={() => setSettingsOpen(true)}
                className="underline hover:text-amber-100 font-medium"
              >
                Pick a different folder
              </button>
              .
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filtered.map((p, i) => (
                <div
                  key={p.path}
                  className="card-enter"
                  style={{ animationDelay: `${Math.min(i * 25, 600)}ms` }}
                >
                  <ProjectCard
                    project={p}
                    selected={p.path === selected}
                    onSelect={() => selectProject(p)}
                    onDoubleClick={() => {
                      selectProject(p);
                      setTimeout(launch, 0);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <SidePanel
          project={selectedProject}
          options={options}
          onChangeOptions={setOptions}
          onLaunch={launch}
          onOpenFolder={openFolder}
        />
      </div>

      {/* Status bar */}
      <footer
        className="text-xs h-5 flex items-center"
        style={{ color: status.color }}
      >
        {status.text}
      </footer>

      {/* Modals */}
      {config && (
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={config}
          onSave={saveSettings}
          onPickFolder={pickFolder}
        />
      )}
      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        configPath={configPath}
      />
    </main>
  );
}
