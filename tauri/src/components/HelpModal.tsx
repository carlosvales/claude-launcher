import { Modal } from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  configPath: string;
}

export function HelpModal({ open, onClose, configPath }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="How it works" size="lg">
      <div className="space-y-4 leading-relaxed">
        <Section title="What this does">
          <p>
            Scans your code folder, lists each subfolder as a project, and lets you
            launch <code className="text-zinc-100">claude</code> inside it with one
            click — preserving your preferred model, effort, and session mode per
            project.
          </p>
        </Section>

        <Section title="Project sort order">
          <p>
            Projects with recent Claude Code sessions appear first (sorted by
            last-modified time of <code>~/.claude/projects/</code>). Projects with
            no sessions yet appear at the bottom, alphabetically.
          </p>
        </Section>

        <Section title="Session modes">
          <ul className="list-disc list-inside space-y-1">
            <li>
              <b>Continue last</b> — resumes your most recent conversation in this
              project (<code>claude --continue</code>).
            </li>
            <li>
              <b>New conversation</b> — starts fresh (<code>claude</code>, no flag).
            </li>
            <li>
              <b>Resume previous</b> — opens the picker to choose any past session
              (<code>claude --resume</code>).
            </li>
          </ul>
        </Section>

        <Section title="Options">
          <ul className="list-disc list-inside space-y-1">
            <li>
              <b>Skip permissions</b> — passes{" "}
              <code>--dangerously-skip-permissions</code>. Convenient for trusted
              local repos. Don't use it for code you don't trust.
            </li>
            <li>
              <b>Voice mode</b> — flag reserved for future voice integration.
            </li>
            <li>
              <b>Model</b> — Opus (max reasoning), Sonnet (balanced), Haiku (fast).
            </li>
            <li>
              <b>Effort</b> — controls thinking budget. Max gives the deepest
              answers but costs more tokens.
            </li>
          </ul>
        </Section>

        <Section title="Per-project memory">
          <p>
            Settings are saved per project automatically when you launch. Next time
            you click that project, the launcher restores those exact options.
          </p>
        </Section>

        <Section title="Keyboard shortcuts">
          <ul className="list-disc list-inside space-y-1">
            <li>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs">
                Enter
              </kbd>{" "}
              — launch the selected project
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs">
                Esc
              </kbd>{" "}
              — deselect / close modal
            </li>
            <li>Double-click any card — launch immediately</li>
          </ul>
        </Section>

        <Section title="AI icons (optional)">
          <p>
            By default, project icons are gradient-with-initials. If you have an
            NVIDIA GPU machine running Stable Diffusion, you can configure it in
            Settings → AI Backend to generate unique icons per project.
          </p>
        </Section>

        <Section title="Where is my config?">
          <p className="break-all">
            <code className="text-zinc-100">{configPath || "(loading…)"}</code>
          </p>
          <p className="text-zinc-400 mt-1">
            Edit it directly only if you know what you're doing. Most settings are
            available in the Settings dialog.
          </p>
        </Section>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-zinc-100 font-semibold mb-1.5">{title}</h3>
      <div className="text-zinc-300">{children}</div>
    </div>
  );
}
