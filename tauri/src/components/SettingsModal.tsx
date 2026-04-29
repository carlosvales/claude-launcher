import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type {
  AiBackend,
  Config,
  DefaultOptions,
  Effort,
  Model,
  SessionMode,
} from "../types";
import { clsx } from "../utils";

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

  useEffect(() => {
    setDraft(config);
  }, [config, open]);

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
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="h-8 px-4 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:bg-zinc-700"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Projects folder */}
        <Section title="Projects folder">
          <p className="text-xs text-zinc-500 mb-2">
            Where the launcher scans for project subfolders.
          </p>
          <div className="flex gap-2">
            <input
              value={draft.projectsDir}
              onChange={(e) => setDraft({ ...draft, projectsDir: e.target.value })}
              className="flex-1 h-8 px-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={pickFolder}
              className="h-8 px-3 rounded-md text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
            >
              Browse…
            </button>
          </div>
        </Section>

        {/* Default options */}
        <Section title="Default options">
          <p className="text-xs text-zinc-500 mb-2">
            Used the first time you click a project. Per-project overrides take
            precedence afterwards.
          </p>

          <Field label="Session">
            <Select
              value={draft.defaultOptions.session}
              values={SESSION_OPTIONS.map((o) => o.value)}
              onChange={(v) => patchDefaults("session", v as SessionMode)}
            />
          </Field>

          <Field label="Model">
            <Select
              value={draft.defaultOptions.model}
              values={MODELS}
              onChange={(v) => patchDefaults("model", v as Model)}
            />
          </Field>

          <Field label="Effort">
            <Select
              value={draft.defaultOptions.effort}
              values={EFFORTS}
              onChange={(v) => patchDefaults("effort", v as Effort)}
            />
          </Field>

          <Checkbox
            label="Skip permissions by default"
            checked={draft.defaultOptions.skipPerms}
            onChange={(v) => patchDefaults("skipPerms", v)}
          />
          <Checkbox
            label="Voice mode by default"
            checked={draft.defaultOptions.voice}
            onChange={(v) => patchDefaults("voice", v)}
          />
        </Section>

        {/* AI backend */}
        <Section title="AI icons (optional)">
          <p className="text-xs text-zinc-500 mb-2">
            Generate unique project icons via Stable Diffusion on a remote GPU
            machine. Disable to use fast gradient fallbacks.
          </p>

          <Checkbox
            label="Enable AI-generated icons"
            checked={draft.aiBackend.enabled}
            onChange={(v) => patchAi("enabled", v)}
          />

          {draft.aiBackend.enabled && (
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-zinc-700">
              <Field label="Ollama URL" hint="e.g. http://gpu-host:11434">
                <input
                  value={draft.aiBackend.ollamaUrl}
                  onChange={(e) => patchAi("ollamaUrl", e.target.value)}
                  className={inputCls()}
                />
              </Field>
              <Field label="Ollama model">
                <input
                  value={draft.aiBackend.ollamaModel}
                  onChange={(e) => patchAi("ollamaModel", e.target.value)}
                  className={inputCls()}
                />
              </Field>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showAdvanced ? "Hide" : "Show"} SSH details
              </button>

              {showAdvanced && (
                <div className="space-y-2 mt-2">
                  <Field label="SSH host">
                    <input
                      value={draft.aiBackend.sshHost}
                      onChange={(e) => patchAi("sshHost", e.target.value)}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="SSH user">
                    <input
                      value={draft.aiBackend.sshUser}
                      onChange={(e) => patchAi("sshUser", e.target.value)}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="SSH key path">
                    <input
                      value={draft.aiBackend.sshKeyPath}
                      onChange={(e) => patchAi("sshKeyPath", e.target.value)}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="Remote script path">
                    <input
                      value={draft.aiBackend.remoteScriptPath}
                      onChange={(e) => patchAi("remoteScriptPath", e.target.value)}
                      className={inputCls()}
                    />
                  </Field>
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
      <h3 className="text-zinc-100 font-semibold mb-2 text-sm">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-2 text-xs">
      <div className="flex items-baseline justify-between">
        <span className="text-zinc-300 font-medium">{label}</span>
        {hint && <span className="text-zinc-500 text-[10px]">{hint}</span>}
      </div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer text-zinc-300 mb-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-blue-500"
      />
      {label}
    </label>
  );
}

function Select({
  value,
  values,
  onChange,
}: {
  value: string;
  values: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "w-full h-8 px-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100",
        "focus:outline-none focus:border-blue-500",
      )}
    >
      {values.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

function inputCls() {
  return "w-full h-8 px-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-blue-500";
}
