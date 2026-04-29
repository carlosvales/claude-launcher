<div align="center">

# Claude Launcher

**A no-nonsense GUI to launch [Claude Code](https://claude.com/claude-code) sessions across all your projects, sorted by last activity.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/carlosvales?label=Sponsor&logo=GitHub&color=ea4aaa)](https://github.com/sponsors/carlosvales)
[![Built with Tauri](https://img.shields.io/badge/built_with-Tauri_2-24C8DB?logo=tauri)](https://tauri.app)
[![Built with Rust](https://img.shields.io/badge/Rust-1.95-orange?logo=rust)](https://rust-lang.org)
[![Stars](https://img.shields.io/github/stars/carlosvales/claude-launcher?style=social)](https://github.com/carlosvales/claude-launcher/stargazers)

> Stop typing `cd path/to/project && claude --continue --model opus` ten times a day. Click a card. Done.

<img src="docs/screenshot.png" alt="Claude Launcher screenshot" width="900" />

</div>

---

## Why

If you work on more than 2-3 projects with Claude Code, you've been here:

- Forgetting which model you used last on each project
- Re-typing the same `--continue --dangerously-skip-permissions --model opus --effort max` flags
- Losing track of which project had a session active 3 days ago

Claude Launcher reads your `~/.claude/projects/` directory, sorts your projects by last session time, and remembers per-project preferences (model, effort, session mode, voice, skip permissions). One double-click → Windows Terminal opens at the project root with `claude` running with your saved options.

## Features

- **Project grid** sorted by last Claude Code session, with a relative time badge per card (`today`, `2d ago`, `3w ago`)
- **Per-project preferences** — model, effort, session mode, skip-permissions, voice — auto-restored on next click
- **Live search** — filter the grid as you type
- **Settings dialog** — native folder picker for `projects_dir`, defaults, optional AI backend toggles
- **Help / how-it-works dialog** — built-in explanation of every option, no need to dig through docs
- **First-run onboarding** — opens Settings automatically when no projects are found
- **Optional AI icons** — generate unique per-project icons via Stable Diffusion on your own GPU machine (see [`ai_backend/README.md`](ai_backend/README.md))
- **Single config file** — `config.json`, no database, no telemetry
- **Two flavors:**
  - `launcher.py` (Python + customtkinter) — small, runs anywhere with Python 3.10+
  - `tauri/` (Tauri 2 + React + Rust) — 9 MB standalone exe, GPU-accelerated UI, Settings/Help modals, smooth animations

## Install

### Tauri version (recommended for Windows)

Download the latest installer from [Releases](https://github.com/carlosvales/claude-launcher/releases) and run it.

Alternatively, build from source:

```bash
# Requires Rust 1.95+, Node 20+, and MSVC Build Tools (Windows) or Xcode (macOS)
git clone https://github.com/carlosvales/claude-launcher
cd claude-launcher/tauri
npm install
npm run tauri build
```

The binary lands in `tauri/src-tauri/target/release/claudelauncher.exe`.

### Python version

```bash
git clone https://github.com/carlosvales/claude-launcher
cd claude-launcher
pip install -r requirements.txt
python launcher.py
```

On first run, the launcher creates `config.json` from `config.json.example`. Edit it and set `projects_dir` to your code folder.

## Configuration

The Tauri version stores its config in `%APPDATA%/claudelauncher/config.json` (Windows) or `~/.config/claudelauncher/config.json` (Linux/Mac). The Python version uses the local `config.json` next to `launcher.py`.

Click **Settings** in the app to edit it through the UI. Or edit by hand:

```json
{
  "projects_dir": "~/Documents/Code",
  "default_options": {
    "session": "continue",
    "skip_perms": true,
    "voice": false,
    "model": "opus",
    "effort": "max"
  },
  "ai_backend": {
    "enabled": false
  }
}
```

| Key | Description | Default |
|---|---|---|
| `projects_dir` | Folder scanned for project subfolders | `~/Documents/Code` |
| `default_options.session` | `continue`, `new`, or `resume` | `continue` |
| `default_options.skip_perms` | Pass `--dangerously-skip-permissions` | `true` |
| `default_options.voice` | Voice mode flag (reserved) | `false` |
| `default_options.model` | `opus`, `sonnet`, or `haiku` | `opus` |
| `default_options.effort` | `low`, `medium`, `high`, or `max` | `max` |
| `ai_backend.enabled` | Use a remote GPU for AI-generated icons | `false` |

Per-project overrides are saved automatically under the `projects` key when you launch a project.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Enter` | Launch selected project |
| `Esc` | Deselect / close modal |
| Double-click on card | Launch immediately |

## AI icons (optional)

By default, project icons are gradient-with-initials, deterministic per project name. They look fine.

If you have a Linux + NVIDIA GPU machine on your network, you can generate unique AI icons via Stable Diffusion Turbo. See [`ai_backend/README.md`](ai_backend/README.md) for the setup.

## Tech

- **Tauri 2** + **Rust 1.95** — desktop runtime, ~9 MB bundle
- **React 19** + **TypeScript** + **Tailwind CSS v4** — UI
- **Python 3.11** + **customtkinter** — alternative Python launcher
- **Pillow** — icon rendering (fallback gradients)
- **Stable Diffusion Turbo** via [`diffusers`](https://github.com/huggingface/diffusers) — optional AI icons on remote GPU

## Roadmap

- [x] Python launcher (v0.1)
- [x] Tauri 2 + React rewrite
- [x] Settings + Help dialogs
- [x] Onboarding flow
- [ ] macOS support (Tauri code is ready, needs `Terminal.app` validation)
- [ ] Linux support (Tauri code is ready, needs `gnome-terminal` validation)
- [ ] GitHub Actions release pipeline (Win + Mac + Linux installers)
- [ ] Pinned projects
- [ ] Per-project environment variables
- [ ] Recent commands history per project

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow.

Especially helpful right now:

- **macOS port** — validate `osascript` launch logic, package `.dmg`
- **Linux port** — validate terminal fallbacks, package `.deb` and `.AppImage`
- **GitHub Actions** — set up release matrix to build for the 3 OSes on tag push

## Support development

Claude Launcher is free and open source. If it saves you time and you want to support continued development:

- [Sponsor on GitHub](https://github.com/sponsors/carlosvales) — recurring or one-time, 0% fees
- Star the repo and share it — costs nothing, helps a lot

Sponsorships go directly into bug fixes, cross-platform support, and new features.

## Disclaimer

This is an unofficial third-party tool. Not affiliated with, endorsed by, or sponsored by Anthropic. "Claude" is a trademark of Anthropic, PBC.

## License

[MIT](LICENSE) © 2026 Carlos Valés
