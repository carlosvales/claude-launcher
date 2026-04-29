# Contributing to Claude Launcher

Thanks for considering a contribution. This document explains how to file bugs, propose features, and submit pull requests.

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting bugs

Open an [issue](https://github.com/carlosvales/claude-launcher/issues/new?template=bug_report.md) using the **Bug report** template. The more concrete the repro steps, the faster a fix lands.

## Proposing features

Open an [issue](https://github.com/carlosvales/claude-launcher/issues/new?template=feature_request.md) using the **Feature request** template. Briefly describe:

- The problem you're trying to solve
- Why the current behavior doesn't work
- What you'd like the launcher to do instead

For non-trivial changes, please open the issue first and wait for a reaction before opening a PR. That way nobody wastes a weekend on something that won't merge.

## Development setup

Requires:

- Rust 1.95+ (`rustup install stable`)
- Node 20.19+ (or 22+)
- Windows: MSVC Build Tools (Desktop development with C++ workload)
- macOS: Xcode Command Line Tools
- Linux: `webkit2gtk` and friends — see [Tauri docs](https://tauri.app/start/prerequisites/)

```bash
git clone https://github.com/carlosvales/claude-launcher
cd claude-launcher
npm install
npm run tauri dev    # Hot reload for both React and Rust
```

## Pull request workflow

1. Fork the repo and create a branch off `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make focused changes. Keep unrelated cleanup in separate PRs.
3. Make sure these all pass:
   - `npx tsc --noEmit` (TypeScript)
   - `npm test` (Vitest)
   - `cd src-tauri && cargo check` (Rust)
   - `cd src-tauri && cargo test` (Rust tests)
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` — new feature
   - `fix:` — bug fix
   - `docs:` — documentation only
   - `refactor:` — code change that neither fixes a bug nor adds a feature
   - `chore:` — tooling, dependency bumps, etc.
   - `test:` — tests
5. Push and open a PR. Fill in the PR template — particularly *what changed* and *how you tested it*.
6. CI must be green before review.

## What's in scope

**In scope:**

- Cross-platform support (macOS, Linux launchers, terminal detection)
- UX improvements (keyboard shortcuts, project filters, pinned projects)
- Performance and bundle size
- Bug fixes for any of the above

**Out of scope (for now):**

- Anything that requires running a service (cloud icons, hosted features) — this app is local-first
- Telemetry or analytics
- Anything that ships user data anywhere by default

## Style

- Rust: `cargo fmt` defaults
- TypeScript/React: keep components functional, hooks at the top, prefer Tailwind utility classes over CSS modules

## Releasing (maintainer notes)

Releases are tagged with `v<MAJOR>.<MINOR>.<PATCH>` and published via GitHub Releases. The `release.yml` workflow builds the Windows installer on tag push and attaches it as a draft release for review before publishing.

## Questions?

Open a [Discussion](https://github.com/carlosvales/claude-launcher/discussions) (when enabled) or an issue. Thanks for helping make this useful for more people.
