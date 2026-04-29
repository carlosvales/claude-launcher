import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { clsx } from "../utils";
import type { AiBackend, Config, DefaultOptions, Effort, Model, SessionMode } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  config: Config;
  onSave: (next: Config) => Promise<void>;
  onPickFolder: () => Promise<string | null>;
}

const SESSION_OPTIONS: { value: SessionMode; label: string }[] = [
  { value: "continue", label: "Continue last" },
  { value: "new", label: "New conversation" },
  { value: "resume", label: "Resume previous" },
];
const MODELS: Model[] = ["opus", "sonnet", "haiku"];
const EFFORTS: Effort[] = ["low", "medium", "high", "max"];

export function SettingsModal({ open, onClose, config, onSave, onPickFolder }: Props) {
  const [draft, setDraft] = useState<Config>(config);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(config); }, [config, open]);

  async function pickFolder() {
    const picked = await onPickFolder();
    if (picked) setDraft({ ...draft, projectsDir: picked });
  }

  function patchDefaults<K extends keyof DefaultOptions>(key: K, value: DefaultOptions[K]) {
    setDraft({ ...draft, defaultOptions: { ...draft.defaultOptions, [key]: value } });
  }

  function patchAi<K extends keyof AiBackend>(key: K, value: AiBackend[K]) {
    setDraft({ ...draft, aiBackend: { ...draft.aiBackend, [key]: value } });
  }

  async function save() {
    setSaving(true);
    try { await onSave(draft); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      size="lg"
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <AccentBtn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</AccentBtn>
        </>
      }
    >
      <div className="space-y-6">
        <Section title="Projects folder">
          <p className="text-xs text-dim mb-2">Where the launcher scans for project subfolders.</p>
          <div className="flex gap-2">
            <input
              value={draft.projectsDir}
              onChange={(e) => setDraft({ ...draft, projectsDir: e.target.value })}
              className="flex-1 h-8 px-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:border-accent transition-colors"
            />
            <GhostBtn onClick={pickFolder}>Browse…</GhostBtn>
          </div>
        </Section>

        <Section title="Default options">
          <p className="text-xs text-dim mb-3">
            Used the first time you click a project. Per-project overrides take precedence.
          </p>
          <Field label="Session">
            <NativeSelect value={draft.defaultOptions.session} values={SESSION_OPTIONS.map((o) => o.value)} onChange={(v) => patchDefaults("session", v as SessionMode)} />
          </Field>
          <Field label="Model">
            <NativeSelect value={draft.defaultOptions.model} values={MODELS} onChange={(v) => patchDefaults("model", v as Model)} />
          </Field>
          <Field label="Effort">
            <NativeSelect value={draft.defaultOptions.effort} values={EFFORTS} onChange={(v) => patchDefaults("effort", v as Effort)} />
          </Field>
          <div className="flex flex-col gap-2 mt-3">
            <ToggleRow label="Skip permissions by default" checked={draft.defaultOptions.skipPerms} onChange={(v) => patchDefaults("skipPerms", v)} />
            <ToggleRow label="Voice mode by default" checked={draft.defaultOptions.voice} onChange={(v) => patchDefaults("voice", v)} />
          </div>
        </Section>

        <Section title="AI icons (optional)">
          <p className="text-xs text-dim mb-3">
            Generate unique icons via Stable Diffusion on a remote GPU machine.
          </p>
          <ToggleRow label="Enable AI-generated icons" checked={draft.aiBackend.enabled} onChange={(v) => patchAi("enabled", v)} />
          {draft.aiBackend.enabled && (
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-border">
              <Field label="Ollama URL" hint="e.g. http://gpu-host:11434">
                <Input value={draft.aiBackend.ollamaUrl} onChange={(v) => patchAi("ollamaUrl", v)} />
              </Field>
              <Field label="Ollama model">
                <Input value={draft.aiBackend.ollamaModel} onChange={(v) => patchAi("ollamaModel", v)} />
              </Field>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-accent hover:text-accent-dark transition-colors"
              >
                {showAdvanced ? "Hide" : "Show"} SSH details
              </button>
              {showAdvanced && (
                <div className="space-y-2 mt-1">
                  {[
                    { label: "SSH host", key: "sshHost" as keyof AiBackend, val: draft.aiBackend.sshHost },
                    { label: "SSH user", key: "sshUser" as keyof AiBackend, val: draft.aiBackend.sshUser },
                    { label: "SSH key path", key: "sshKeyPath" as keyof AiBackend, val: draft.aiBackend.sshKeyPath },
                    { label: "Remote script path", key: "remoteScriptPath" as keyof AiBackend, val: draft.aiBackend.remoteScriptPath },
                  ].map(({ label, key, val }) => (
                    <Field key={key as string} label={label}>
                      <Input value={val as string} onChange={(v) => patchAi(key, v as AiBackend[typeof key])} />
                    </Field>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-dim uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block mb-2 text-xs">
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-medium text-muted">{label}</span>
        {hint && <span className="text-[10px] text-dim">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 px-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:border-accent transition-colors"
    />
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 cursor-pointer",
          checked ? "bg-accent" : "bg-border",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked && "translate-x-4",
          )}
        />
      </button>
    </div>
  );
}

function NativeSelect({ value, values, onChange }: { value: string; values: readonly string[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 px-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:border-accent cursor-pointer transition-colors"
    >
      {values.map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-8 px-3 rounded-lg text-xs font-medium bg-surface-2 text-muted border border-border hover:bg-surface-3 hover:text-text transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

function AccentBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "h-8 px-4 rounded-lg text-xs font-semibold transition-colors",
        disabled
          ? "bg-surface-2 text-dim cursor-not-allowed"
          : "bg-accent hover:bg-accent-dark text-white cursor-pointer",
      )}
    >
      {children}
    </button>
  );
}
