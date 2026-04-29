import { invoke } from "@tauri-apps/api/core";
import type { Config, LaunchOptions, Project } from "./types";

export const api = {
  scanProjects: (projectsDir: string) =>
    invoke<Project[]>("scan_projects", { projectsDir }),

  launchClaude: (projectPath: string, options: LaunchOptions) =>
    invoke<void>("launch_claude", { projectPath, options }),

  openFolder: (path: string) =>
    invoke<void>("open_folder", { path }),

  loadConfig: () => invoke<Config>("load_config"),

  saveConfig: (config: Config) =>
    invoke<void>("save_config", { config }),

  configFilePath: () => invoke<string>("config_file_path"),
};
