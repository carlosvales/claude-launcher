import type { Effort, LaunchOptions, Model, Project, SessionMode } from "../types";
import { clsx } from "../utils";

interface Props {
  project: Project | null;
  options: LaunchOptions;
  onChangeOptions: (next: LaunchOptions) => void;
  onLaunch: () => void;
  onOpenFolder: () => void;
}

const SESSION_OPTIONS: { value: SessionMode; label: string }[] = [
  { value: "continue", label: "Continue" },
  { value: "new", label: "New" },
  { value: "resume", label: "Resume" },
];

const MODELS: { value: Model; label: string }[] = [
  { value: "opus", label: "Opus" },
  { value: "sonnet", label: "Sonnet" },
  { value: "haiku", label: "Haiku" },
];

const EFFORTS: { value: Effort; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Med" },
  { value: "high", label: "High" },
  { value: "max", label: "Max" },
];

export function SidePanel({ project, options, onChangeOptions, onLaunch, onOpenFolder }: Props) {
  const disabled = !project;

  function patch<K extends keyof LaunchOptions>(key: K, value: LaunchOptions[K]) {
    onChangeOptions({ ...options, [key]: value });
  }

  return (
    <aside className="w-[272px] flex flex-col p-4 h-full bg-surface">
      <div className="pb-3">
        <h3 className="text-sm font-semibold text-text truncate leading-snug">
          {project ? project.name : "No project selected"}
        </h3>
        {project && (
          <p className="text-[10px] text-dim break-all mt-0.5 leading-tight">{project.path}</p>
        )}
      </div>

      <Divider />

      <div className="py-3 flex flex-col gap-2.5">
        <Label>Session</Label>
        <SegmentedControl
          options={SESSION_OPTIONS}
          value={options.session}
          onChange={(v) => patch("session", v as SessionMode)}
          disabled={disabled}
        />
      </div>

      <Divider />

      <div className="py-3 flex flex-col gap-2.5">
        <Label>Options</Label>
        <ToggleRow label="Skip permissions" checked={options.skipPerms} onChange={(v) => patch("skipPerms", v)} disabled={disabled} />
        <ToggleRow label="Voice mode" checked={options.voice} onChange={(v) => patch("voice", v)} disabled={disabled} />
      </div>

      <Divider />

      <div className="py-3 flex flex-col gap-2.5">
        <Label>Model</Label>
        <SegmentedControl
          options={MODELS}
          value={options.model}
          onChange={(v) => patch("model", v as Model)}
          disabled={disabled}
        />
      </div>

      <div className="pb-3 flex flex-col gap-2.5">
        <Label>Effort</Label>
        <SegmentedControl
          options={EFFORTS}
          value={options.effort}
          onChange={(v) => patch("effort", v as Effort)}
          disabled={disabled}
        />
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={onLaunch}
          disabled={disabled}
          className={clsx(
            "h-10 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.98]",
            disabled
              ? "bg-surface-2 text-dim cursor-not-allowed"
              : "bg-accent hover:bg-accent-dark text-white cursor-pointer",
          )}
        >
          Open Project
        </button>

        <button
          onClick={onOpenFolder}
          disabled={disabled}
          className={clsx(
            "h-8 rounded-lg text-xs font-medium border border-border transition-all duration-150 active:scale-[0.98]",
            disabled
              ? "bg-surface-2 text-dim cursor-not-allowed opacity-50"
              : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-text cursor-pointer",
          )}
        >
          Open folder
        </button>
      </div>
    </aside>
  );
}

function Divider() {
  return <div className="w-full h-px bg-border" />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-dim uppercase tracking-widest">{children}</div>
  );
}

function SegmentedControl({
  options, value, onChange, disabled,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={clsx("flex bg-bg rounded-lg p-0.5 gap-0.5", disabled && "opacity-40 pointer-events-none")}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            "flex-1 text-xs py-1.5 rounded-md transition-all duration-150 font-medium",
            value === opt.value ? "bg-surface-3 text-text" : "text-dim hover:text-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({
  label, checked, onChange, disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={clsx("text-sm", disabled ? "text-dim" : "text-muted")}>{label}</span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function Toggle({
  checked, onChange, disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={clsx(
        "relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0",
        checked ? "bg-accent" : "bg-border",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
