"""Unit tests for the Python launcher's pure functions."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Make the launcher importable when running pytest from the repo root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Skip the whole module if customtkinter (a launcher import) is unavailable;
# CI installs it via requirements.txt but local devs may not.
ctk = pytest.importorskip("customtkinter", reason="customtkinter not installed")

import launcher  # noqa: E402  (imported after path insertion)


class TestDeepMerge:
    def test_shallow_merge(self):
        result = launcher._deep_merge({"a": 1}, {"b": 2})
        assert result == {"a": 1, "b": 2}

    def test_override_wins(self):
        result = launcher._deep_merge({"a": 1}, {"a": 2})
        assert result == {"a": 2}

    def test_nested_dicts_are_merged_recursively(self):
        base = {"opts": {"x": 1, "y": 2}}
        override = {"opts": {"y": 99, "z": 3}}
        result = launcher._deep_merge(base, override)
        assert result == {"opts": {"x": 1, "y": 99, "z": 3}}

    def test_does_not_mutate_inputs(self):
        base = {"a": {"x": 1}}
        override = {"a": {"y": 2}}
        launcher._deep_merge(base, override)
        assert base == {"a": {"x": 1}}
        assert override == {"a": {"y": 2}}

    def test_non_dict_override_replaces_dict(self):
        # If override has a non-dict value where base has a dict, override wins
        result = launcher._deep_merge({"a": {"nested": 1}}, {"a": "string"})
        assert result == {"a": "string"}


class TestProjectsDir:
    def test_expands_tilde(self):
        cfg = {"projects_dir": "~/Documents/Code"}
        result = launcher.projects_dir(cfg)
        assert "~" not in str(result)
        assert result.name == "Code"

    def test_falls_back_to_default_when_missing(self):
        result = launcher.projects_dir({})
        assert result == Path(launcher.DEFAULT_CONFIG["projects_dir"]).expanduser()


class TestLoadConfig:
    def test_creates_config_from_defaults_when_missing(self, tmp_path, monkeypatch):
        cfg_file = tmp_path / "config.json"
        monkeypatch.setattr(launcher, "CONFIG_FILE", cfg_file)
        monkeypatch.setattr(launcher, "CONFIG_EXAMPLE", tmp_path / "missing.example")

        cfg = launcher.load_config()

        assert cfg_file.exists()
        assert cfg["default_options"]["model"] == "opus"
        assert cfg["ai_backend"]["enabled"] is False

    def test_existing_config_is_merged_with_defaults(self, tmp_path, monkeypatch):
        cfg_file = tmp_path / "config.json"
        cfg_file.write_text(json.dumps({"last_project": "myproj"}), encoding="utf-8")
        monkeypatch.setattr(launcher, "CONFIG_FILE", cfg_file)
        monkeypatch.setattr(launcher, "CONFIG_EXAMPLE", tmp_path / "missing.example")

        cfg = launcher.load_config()

        # User value preserved
        assert cfg["last_project"] == "myproj"
        # Defaults filled in
        assert cfg["default_options"]["effort"] == "max"
        assert cfg["projects_dir"]
