import type {
  Effort,
  LaunchOptions,
  Model,
  Project,
  SessionMode,
} from "../types";
import { clsx } from "../utils";

interface Props {
  project: Project | null;
  options: LaunchOptions;
  onChangeOptions: (next: LaunchOptions) => void;
  onLaunch: () => void;
  onOpenFolder: () => void;
}

const SESSION_OPTIONS: { value: SessionMode; label: string }[] = [
  { value: "continue", label: "Continue last" },
  { value: "new", label: "New conversation" },
  { value: "resume", label: "Resume previous" },
];

const MODELS: Model[] = ["opus", "sonnet", "haiku"];
const EFFORTS: Effort[] = ["low", "medium", "high", "max"];

export function SidePanel({
  project,
  options,
  onChangeOptions,
  onLaunch,
  onOpenFolder,
}: Props) {
  const disabled = !project;

  function patch<K extends keyof LaunchOptions>(key: K, value: LaunchOptions[K]) {
    onChangeOptions({ ...options, [key]: value });
  }

  return (
    <aside className="w-72 flex flex-col bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <div className="mb-3">
        <h3 className="text-base font-bold text-zinc-100 truncate">
          {project ? project.name : "No project selected"}
        </h3>
        {project && (
          <p className="text-[10px] text-zinc-500 break-all mt-1 leading-tight">
            {project.path}
          </p>
        )}
      </div>

      <hr className="border-zinc-700 my-2" />

      <Section title="Session">
        <div className="flex flex-col gap-1.5">
          {SESSION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm cursor-pointer text-zinc-300"
            >
              <input
                type="radio"
                checked={options.session === opt.value}
                onChange={() => patch("session", opt.value)}
                disabled={disabled}
                className="accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </Section>

      <hr className="border-zinc-700 my-2" />

      <Section title="Options">
        <Checkbox
          label="Skip permissions"
          checked={options.skipPerms}
          onChange={(v) => patch("skipPerms", v)}
          disabled={disabled}
        />
        <Checkbox
          label="Voice mode"
          checked={options.voice}
          onChange={(v) => patch("voice", v)}
          disabled={disabled}
        />
      </Section>

      <hr className="border-zinc-700 my-2" />

      <Section title="Model">
        <Select
          value={options.model}
          values={MODELS}
          onChange={(v) => patch("model", v as Model)}
          disabled={disabled}
        />
      </Section>

      <Section title="Effort">
        <Select
          value={options.effort}
          values={EFFORTS}
          onChange={(v) => patch("effort", v as Effort)}
          disabled={disabled}
        />
      </Section>

      <div className="flex-1" />

      <button
        onClick={onLaunch}
        disabled={disabled}
        className={clsx(
          "h-12 rounded-lg text-sm font-bold transition-colors",
          "bg-blue-600 hover:bg-blue-500 text-white",
          "disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed",
        )}
      >
        Open Project
      </button>

      <button
        onClick={onOpenFolder}
        disabled={disabled}
        className={clsx(
          "mt-2 h-9 rounded-lg text-xs font-medium transition-colors",
          "bg-zinc-800 hover:bg-zinc-700 text-zinc-300",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        Open folder
      </button>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-bold text-zinc-200 uppercase tracking-wide mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer text-zinc-300 mb-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
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
  disabled,
}: {
  value: string;
  values: readonly string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={clsx(
        "w-full h-8 px-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-zinc-100",
        "focus:outline-none focus:border-blue-500 disabled:opacity-50",
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
