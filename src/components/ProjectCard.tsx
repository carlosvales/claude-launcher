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
        "group flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl w-full border transition-all duration-150 active:scale-[0.97]",
        selected
          ? "bg-surface-3 border-accent shadow-[0_0_0_2px_rgba(218,119,86,0.15)]"
          : "bg-surface border-border hover:bg-surface-2",
      )}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-sm shadow-md transition-transform duration-150 group-hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      >
        {initials(project.name)}
      </div>
      <div className="text-[13px] font-medium text-text truncate max-w-full">
        {display}
      </div>
      {/* lastSessionColor is dynamic data from the backend, inline style is intentional */}
      <div className="text-[11px] font-medium tabular-nums" style={{ color: project.lastSessionColor }}>
        {project.lastSessionLabel}
      </div>
    </button>
  );
}
