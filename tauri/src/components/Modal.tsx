import { useEffect, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, title, children, footer, size = "md" }: Props) {
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overlay-enter"
      onClick={onClose}
    >
      <div
        className={`w-full ${SIZE_CLASS[size]} mx-4 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col max-h-[85vh] modal-enter`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <h2 className="text-base font-bold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 text-sm text-zinc-300">
          {children}
        </div>
        {footer && (
          <footer className="px-5 py-3 border-t border-zinc-800 flex justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
