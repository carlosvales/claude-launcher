"""Static checks for .github/workflows/release.yml.

These tests don't run GitHub Actions — they validate the workflow file
locally so that obvious breakages (broken trigger conditions, missing
test gate, unpinned third-party action publishing binaries) are caught
before a tag push burns CI minutes or, worse, ships a bad release.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "release.yml"


@pytest.fixture(scope="module")
def workflow() -> dict:
    raw = WORKFLOW_PATH.read_text(encoding="utf-8")
    parsed = yaml.safe_load(raw)
    # PyYAML maps the literal `on:` key to the boolean True because YAML 1.1
    # treats `on` as a synonym for true. Normalize so the rest of the tests
    # can refer to it as a string.
    if True in parsed:
        parsed["on"] = parsed.pop(True)
    return parsed


@pytest.fixture(scope="module")
def build_steps(workflow: dict) -> list[dict]:
    return workflow["jobs"]["build"]["steps"]


def _find_steps(steps: list[dict], predicate) -> list[dict]:
    return [s for s in steps if predicate(s)]


class TestStructure:
    def test_yaml_parses(self, workflow: dict) -> None:
        assert workflow["name"] == "Release"

    def test_triggers_on_tag_push_and_dispatch(self, workflow: dict) -> None:
        triggers = workflow["on"]
        assert "push" in triggers
        assert triggers["push"]["tags"] == ["v*"]
        assert "workflow_dispatch" in triggers

    def test_permissions_are_job_scoped_not_workflow_scoped(self, workflow: dict) -> None:
        # Audit fix #4: contents:write should NOT live at workflow level
        # because it would apply to every step (including ones that could be
        # compromised via a malicious action upgrade).
        assert "permissions" not in workflow, (
            "permissions should be on the job, not the whole workflow"
        )
        assert workflow["jobs"]["build"]["permissions"] == {"contents": "write"}


class TestRustToolchainFix:
    """Audit HIGH #2: rust-toolchain must not receive an empty-string `targets`."""

    def test_rust_toolchain_step_has_no_targets_input(self, build_steps: list[dict]) -> None:
        toolchain_steps = _find_steps(
            build_steps,
            lambda s: isinstance(s.get("uses"), str) and s["uses"].startswith("dtolnay/rust-toolchain"),
        )
        assert len(toolchain_steps) == 1, "expected exactly one rust-toolchain step"
        # No `with.targets` at all — passing '' would run `rustup target add ''`
        # on Windows and break every build.
        assert "targets" not in toolchain_steps[0].get("with", {})

    def test_macos_targets_are_added_via_separate_conditional_step(self, build_steps: list[dict]) -> None:
        macos_target_steps = _find_steps(
            build_steps,
            lambda s: s.get("name", "").startswith("Add macOS Rust targets"),
        )
        assert len(macos_target_steps) == 1
        assert macos_target_steps[0]["if"] == "matrix.platform == 'macos-latest'"
        # Should add both arches for the universal binary.
        run_cmd = macos_target_steps[0]["run"]
        assert "aarch64-apple-darwin" in run_cmd
        assert "x86_64-apple-darwin" in run_cmd


class TestTagOnlyReleaseFix:
    """Audit HIGH #1: tauri-action must not be invoked with empty tagName."""

    def _tauri_steps(self, build_steps: list[dict]) -> list[dict]:
        return _find_steps(
            build_steps,
            lambda s: isinstance(s.get("uses"), str) and s["uses"].startswith("tauri-apps/tauri-action"),
        )

    def test_two_tauri_action_invocations_gated_by_event(self, build_steps: list[dict]) -> None:
        steps = self._tauri_steps(build_steps)
        assert len(steps) == 2, "expected one tag-push step and one dispatch step"

    def test_release_step_runs_only_on_tag_push(self, build_steps: list[dict]) -> None:
        steps = self._tauri_steps(build_steps)
        release_steps = [s for s in steps if "tagName" in s.get("with", {})]
        assert len(release_steps) == 1
        assert release_steps[0]["if"] == "startsWith(github.ref, 'refs/tags/')"
        # tagName must reference the tag literally, not be a conditional that
        # could collapse to ''.
        assert release_steps[0]["with"]["tagName"] == "${{ github.ref_name }}"
        assert release_steps[0]["with"]["releaseDraft"] is True

    def test_dispatch_step_does_not_create_release(self, build_steps: list[dict]) -> None:
        steps = self._tauri_steps(build_steps)
        dispatch_steps = [s for s in steps if "tagName" not in s.get("with", {})]
        assert len(dispatch_steps) == 1
        assert dispatch_steps[0]["if"] == "github.event_name == 'workflow_dispatch'"
        # Absence of tagName/releaseName/releaseDraft tells tauri-action to
        # build only and skip the GitHub Release API entirely.
        for forbidden in ("tagName", "releaseName", "releaseBody", "releaseDraft"):
            assert forbidden not in dispatch_steps[0]["with"]


class TestSupplyChain:
    """Audit MEDIUM #3: tauri-action must be SHA-pinned (handles GITHUB_TOKEN
    and produces the binary end-users install)."""

    SHA_RE = re.compile(r"^[0-9a-f]{40}$")

    def test_tauri_action_uses_pinned_commit_sha(self, build_steps: list[dict]) -> None:
        for step in build_steps:
            uses = step.get("uses", "")
            if uses.startswith("tauri-apps/tauri-action"):
                ref = uses.split("@", 1)[1]
                assert self.SHA_RE.match(ref), (
                    f"tauri-action must be pinned to a 40-char commit SHA, got '{ref}'"
                )

    def test_all_tauri_action_steps_use_same_sha(self, build_steps: list[dict]) -> None:
        shas = {
            step["uses"].split("@", 1)[1]
            for step in build_steps
            if step.get("uses", "").startswith("tauri-apps/tauri-action")
        }
        assert len(shas) == 1, f"tauri-action steps disagree on SHA: {shas}"


class TestTestGate:
    """Audit MEDIUM #5: tag-push skips ci.yml, so tests must run inside this
    workflow before the binary is built."""

    def _step_names(self, steps: list[dict]) -> list[str]:
        return [s.get("name", s.get("uses", "")) for s in steps]

    def test_npm_test_runs_in_release_workflow(self, build_steps: list[dict]) -> None:
        commands = [s.get("run", "") for s in build_steps if "run" in s]
        assert any("npm test" in cmd for cmd in commands), "npm test missing"
        assert any("tsc --noEmit" in cmd for cmd in commands), "tsc typecheck missing"

    def test_cargo_test_runs_in_release_workflow(self, build_steps: list[dict]) -> None:
        commands = [s.get("run", "") for s in build_steps if "run" in s]
        assert any("cargo test" in cmd for cmd in commands), "cargo test missing"

    def test_tests_run_before_tauri_build(self, build_steps: list[dict]) -> None:
        names = self._step_names(build_steps)
        try:
            tests_idx = next(
                i for i, s in enumerate(build_steps)
                if "cargo test" in s.get("run", "")
            )
            build_idx = next(
                i for i, s in enumerate(build_steps)
                if s.get("uses", "").startswith("tauri-apps/tauri-action")
            )
        except StopIteration:
            pytest.fail(f"missing test or build step. step names: {names}")
        assert tests_idx < build_idx, (
            f"cargo test (idx {tests_idx}) must run before tauri-action (idx {build_idx})"
        )


class TestReferencedFilesExist:
    """Catch typos in working-directory and cache-dependency-path that would
    only surface at CI time."""

    def test_tauri_directory_exists(self) -> None:
        assert (REPO_ROOT / "tauri").is_dir()

    def test_lockfile_referenced_by_setup_node_exists(self) -> None:
        assert (REPO_ROOT / "tauri" / "package-lock.json").is_file()

    def test_src_tauri_directory_exists(self) -> None:
        assert (REPO_ROOT / "tauri" / "src-tauri").is_dir()
        assert (REPO_ROOT / "tauri" / "src-tauri" / "Cargo.toml").is_file()

    def test_npm_test_script_is_defined(self) -> None:
        import json

        pkg = json.loads((REPO_ROOT / "tauri" / "package.json").read_text(encoding="utf-8"))
        assert "test" in pkg.get("scripts", {}), "package.json has no `test` script"
