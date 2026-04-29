import { Modal } from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  configPath: string;
}

export function HelpModal({ open, onClose, configPath }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="How it works" size="lg">
      <div className="space-y-5 leading-relaxed">
        <Section title="What this does">
          <p>
            Scans your code folder, lists each subfolder as a project, and lets you launch{" "}
            <Code>claude</Code> inside it with one click — preserving your preferred model,
            effort, and session mode per project.
          </p>
        </Section>

        <Section title="Project sort order">
          <p>
            Projects with recent Claude Code sessions appear first (sorted by last-modified
            time of <Code>~/.claude/projects/</Code>). Projects with no sessions yet appear
            at the bottom, alphabetically.
          </p>
        </Section>

        <Section title="Session modes">
          <ul className="space-y-1.5 mt-1">
            <li><b className="text-text">Continue</b> — resumes your most recent conversation (<Code>claude --continue</Code>).</li>
            <li><b className="text-text">New</b> — starts fresh (<Code>claude</Code>, no flag).</li>
            <li><b className="text-text">Resume</b> — opens the picker to choose any past session (<Code>claude --resume</Code>).</li>
          </ul>
        </Section>

        <Section title="Options">
          <ul className="space-y-1.5 mt-1">
            <li><b className="text-text">Skip permissions</b> — passes <Code>--dangerously-skip-permissions</Code>. Only for trusted local repos.</li>
            <li><b className="text-text">Voice mode</b> — reserved for future voice integration.</li>
            <li><b className="text-text">Model</b> — Opus (max reasoning), Sonnet (balanced), Haiku (fast).</li>
            <li><b className="text-text">Effort</b> — controls thinking budget. Max gives deepest answers but costs more tokens.</li>
          </ul>
        </Section>

        <Section title="Per-project memory">
          <p>
            Settings are saved per project automatically when you launch. Next time you
            click that project, the launcher restores those exact options.
          </p>
        </Section>

        <Section title="Keyboard shortcuts">
          <ul className="space-y-1.5 mt-1">
            <li><Kbd>Enter</Kbd> — launch selected project</li>
            <li><Kbd>Esc</Kbd> — deselect / close modal</li>
            <li>Double-click any card — launch immediately</li>
          </ul>
        </Section>

        <Section title="Config file">
          <p className="break-all"><Code>{configPath || "(loading…)"}</Code></p>
          <p className="mt-1">
            Most settings are available in the Settings dialog. Edit the file directly only
            if you know what you're doing.
          </p>
        </Section>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-dim uppercase tracking-widest mb-2">{title}</h3>
      <div className="text-muted">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1 py-0.5 rounded text-xs bg-surface-2 text-text font-mono">
      {children}
    </code>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded text-xs mr-1.5 bg-surface-2 border border-border text-text font-mono">
      {children}
    </kbd>
  );
}
