import { useEffect, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, children, footer, size = "md" }: Props) {
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm overlay-enter"
      onClick={onClose}
    >
      <div
        className={`w-full ${SIZE_CLASS[size]} mx-4 rounded-2xl flex flex-col max-h-[85vh] shadow-2xl modal-enter bg-surface border border-border`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full text-sm leading-none bg-surface-2 text-muted hover:bg-surface-3 hover:text-text transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 text-sm text-muted">
          {children}
        </div>

        {footer && (
          <footer className="px-5 py-3 flex justify-end gap-2 border-t border-border">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
