import type { Project } from "../types";
import { clsx, fallbackGradient, initials } from "../utils";

interface Props {
  project: Project;
  selected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

export function ProjectCard({ project, selected, onSelect, onDoubleClick }: Props) {
  const { from, to } = fallbackGradient(project.name);
  const display = project.name.length > 18 ? project.name.slice(0, 16) + "…" : project.name;

  return (
    <button
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      title={project.path}
      className={clsx(
        "group flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border w-full",
        "bg-zinc-900 hover:bg-zinc-800/80 transition-all duration-150",
        "active:scale-[0.98]",
        selected
          ? "border-blue-500 ring-2 ring-blue-500/20 bg-zinc-800/80"
          : "border-zinc-800 hover:border-zinc-700",
      )}
    >
      <div
        className={clsx(
          "w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-lg",
          "transition-transform duration-150 group-hover:scale-105",
        )}
        style={{
          background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        }}
      >
        {initials(project.name)}
      </div>
      <div className="text-[13px] font-semibold text-zinc-100 truncate max-w-full">
        {display}
      </div>
      <div
        className="text-[11px] tabular-nums font-medium"
        style={{ color: project.lastSessionColor }}
      >
        {project.lastSessionLabel}
      </div>
    </button>
  );
}
