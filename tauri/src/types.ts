export type SessionMode = "continue" | "new" | "resume";
export type Model = "opus" | "sonnet" | "haiku";
export type Effort = "low" | "medium" | "high" | "max";

export interface Project {
  name: string;
  path: string;
  lastSessionIso: string | null;
  lastSessionLabel: string;
  lastSessionColor: string;
  hasSession: boolean;
}

export interface LaunchOptions {
  session: SessionMode;
  skipPerms: boolean;
  voice: boolean;
  model: Model;
  effort: Effort;
}

export interface DefaultOptions extends LaunchOptions {}

export interface AiBackend {
  enabled: boolean;
  ollamaUrl: string;
  ollamaModel: string;
  sshHost: string;
  sshUser: string;
  sshKeyPath: string;
  remoteScriptPath: string;
  remoteOutputDir: string;
}

export interface ProjectPrefs extends LaunchOptions {}

export interface Config {
  projectsDir: string;
  defaultOptions: DefaultOptions;
  aiBackend: AiBackend;
  lastProject: string;
  projects: Record<string, ProjectPrefs>;
}
