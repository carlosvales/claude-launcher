"""
Claude Launcher - GUI to manage your Claude Code projects.
Project cards with last activity, AI-designed icons (optional GPU backend),
and one-click launch with custom session/model/effort options.
"""

import customtkinter as ctk
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import subprocess
import hashlib
import json
import math
import os
import shutil
import urllib.request
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# ── Paths ─────────────────────────────────────────────────────

CONFIG_FILE = Path(__file__).parent / "config.json"
CONFIG_EXAMPLE = Path(__file__).parent / "config.json.example"
ICON_CACHE = Path(__file__).parent / "icons"
CLAUDE_DIR = Path.home() / ".claude"
EXCLUDED_DIRS = {
    "claude-launcher", "ai_backend", ".git", "__pycache__",
    "node_modules", ".venv", "venv", "desktop.ini",
    "src-tauri", "target", "dist", "build",
}

FALLBACK_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#6C5CE7",
    "#DDA0DD", "#00B894", "#F7DC6F", "#BB8FCE", "#0984E3",
    "#F8C471", "#00CEC9", "#E17055", "#74B9FF", "#A29BFE",
    "#55EFC4", "#FAD7A0", "#81ECEC", "#FD79A8", "#636E72",
]

ICON_DISPLAY = 52
ICON_RENDER = 256


# ── Persistence ───────────────────────────────────────────────

DEFAULT_CONFIG = {
    "projects_dir": str(Path.home() / "Documents" / "Code"),
    "ai_backend": {
        "enabled": False,
        "ollama_url": "http://localhost:11434",
        "ollama_model": "gemma3:4b",
        "ssh_host": "",
        "ssh_user": "",
        "ssh_key_path": str(Path.home() / ".ssh" / "id_rsa"),
        "remote_script_path": "/tmp/gen_icons_server.py",
        "remote_output_dir": "/tmp/claude-icons",
    },
    "default_options": {
        "session": "continue",
        "skip_perms": True,
        "voice": False,
        "model": "opus",
        "effort": "max",
    },
    "last_project": "",
    "projects": {},
}


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base, returning a new dict."""
    out = dict(base)
    for k, v in override.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def load_config() -> dict:
    """Load config.json. If missing, seed from config.json.example or defaults."""
    if not CONFIG_FILE.exists():
        if CONFIG_EXAMPLE.exists():
            shutil.copy(CONFIG_EXAMPLE, CONFIG_FILE)
        else:
            CONFIG_FILE.write_text(
                json.dumps(DEFAULT_CONFIG, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
    try:
        user_cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        user_cfg = {}
    return _deep_merge(DEFAULT_CONFIG, user_cfg)


def save_config(config: dict) -> None:
    CONFIG_FILE.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")


def projects_dir(config: dict) -> Path:
    """Resolve projects_dir from config, expanding ~ and env vars."""
    raw = config.get("projects_dir") or DEFAULT_CONFIG["projects_dir"]
    return Path(os.path.expandvars(os.path.expanduser(raw)))


# ── Session detection ─────────────────────────────────────────

def _sessions_dir(project_path: Path) -> Path:
    raw = str(project_path).replace("\\", "-").replace("/", "-").replace(":", "-").replace(" ", "-")
    return CLAUDE_DIR / "projects" / raw


def session_mtime(project_path: Path) -> float:
    sd = _sessions_dir(project_path)
    try:
        return sd.stat().st_mtime if sd.exists() else 0.0
    except OSError:
        return 0.0


def last_session_text(project_path: Path) -> tuple[str, str]:
    mt = session_mtime(project_path)
    if mt == 0.0:
        return "sin sesiones", "gray50"
    delta = (datetime.now() - datetime.fromtimestamp(mt)).days
    if delta == 0:
        return "hoy", "#4ECDC4"
    if delta == 1:
        return "ayer", "#4ECDC4"
    if delta < 7:
        return f"hace {delta}d", "#82E0AA"
    if delta < 30:
        return f"hace {delta // 7}sem", "#F8C471"
    return datetime.fromtimestamp(mt).strftime("%d/%m"), "gray55"


def project_sort_key(p: Path) -> tuple[int, float, str]:
    mt = session_mtime(p)
    return (0, -mt, p.name.lower()) if mt > 0 else (1, 0.0, p.name.lower())


# ── Icon rendering (Pillow) ──────────────────────────────────

def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _draw_shape_mask(draw: ImageDraw.Draw, shape: str, size: int) -> None:
    cx, cy, r = size // 2, size // 2, size // 2 - 10
    if shape == "circle":
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    elif shape == "hexagon":
        pts = [(cx + r * math.cos(math.radians(a - 90)), cy + r * math.sin(math.radians(a - 90))) for a in range(0, 360, 60)]
        draw.polygon(pts, fill=255)
    elif shape == "diamond":
        draw.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=255)
    elif shape == "shield":
        draw.polygon([
            (cx - r, cy - r * 0.6), (cx, cy - r), (cx + r, cy - r * 0.6),
            (cx + r, cy + r * 0.3), (cx, cy + r), (cx - r, cy + r * 0.3),
        ], fill=255)
    else:  # square
        draw.rounded_rectangle([cx - r, cy - r, cx + r, cy + r], radius=r // 3, fill=255)


def render_icon(shape: str, color1: str, color2: str, symbol: str, size: int = ICON_RENDER) -> Image.Image:
    r1, g1, b1 = hex_to_rgb(color1)
    r2, g2, b2 = hex_to_rgb(color2)

    # Gradient base
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gradient = Image.new("RGBA", (size, size))
    for y in range(size):
        t = y / size
        for x in range(size):
            # Diagonal gradient for more depth
            t2 = (x / size * 0.3 + y / size * 0.7)
            gradient.putpixel((x, y), (
                int(r1 + (r2 - r1) * t2),
                int(g1 + (g2 - g1) * t2),
                int(b1 + (b2 - b1) * t2),
                255,
            ))

    # Shape mask
    mask = Image.new("L", (size, size), 0)
    _draw_shape_mask(ImageDraw.Draw(mask), shape, size)

    # Apply mask to gradient
    base.paste(gradient, mask=mask)

    # Subtle inner glow (lighter top-left)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    glow_r = size // 3
    gd.ellipse(
        [size // 4 - glow_r, size // 5 - glow_r, size // 4 + glow_r, size // 5 + glow_r],
        fill=(255, 255, 255, 35),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=size // 6))
    glow_mask = mask.copy()
    base = Image.alpha_composite(base, Image.composite(glow, Image.new("RGBA", (size, size), (0, 0, 0, 0)), glow_mask))

    # Draw symbol
    draw = ImageDraw.Draw(base)
    font_size = size // 3 if len(symbol) <= 1 else size // 4

    font = None
    for fname in ("segoeuib.ttf", "segoeui.ttf", "arial.ttf"):
        try:
            font = ImageFont.truetype(fname, font_size)
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), symbol, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) // 2
    ty = (size - th) // 2 - bbox[1]

    # Text shadow
    draw.text((tx + 2, ty + 2), symbol, fill=(0, 0, 0, 60), font=font)
    draw.text((tx, ty), symbol, fill="white", font=font)

    return base


def generate_fallback_icon(name: str, size: int = ICON_RENDER) -> Image.Image:
    h = int(hashlib.md5(name.encode()).hexdigest(), 16)
    color = FALLBACK_COLORS[h % len(FALLBACK_COLORS)]
    words = name.replace("-", " ").replace("_", " ").split()
    initials = "".join(w[0].upper() for w in words[:2]) or name[0].upper()
    return render_icon("square", color, _darken(color, 50), initials, size)


def _darken(hex_color: str, amount: int) -> str:
    r, g, b = hex_to_rgb(hex_color)
    return f"#{max(0,r-amount):02x}{max(0,g-amount):02x}{max(0,b-amount):02x}"


# ── AI icon generation via remote GPU (optional) ──────────────

def _expand(path: str) -> str:
    return os.path.expandvars(os.path.expanduser(path))


def ai_backend_ready(backend: dict) -> bool:
    """Check if AI backend is configured well enough to attempt generation."""
    return bool(
        backend.get("enabled")
        and backend.get("ssh_host")
        and backend.get("ssh_user")
        and backend.get("ollama_url")
    )


def _ollama_prompt(project_name: str, backend: dict) -> str:
    """Ask Ollama for a creative image prompt."""
    try:
        data = json.dumps({
            "model": backend.get("ollama_model", "gemma3:4b"),
            "prompt": (
                f'Write a short image prompt (max 12 words) for an app icon representing '
                f'a project called "{project_name}". The icon should be a recognizable '
                f'symbol or object, NOT text. Output ONLY the prompt.'
            ),
            "stream": False,
        }).encode()
        req = urllib.request.Request(
            f"{backend['ollama_url']}/api/generate",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            return result["response"].strip().strip('"')
    except Exception:
        return f"modern app icon for {project_name.replace('-', ' ')}"


def generate_icons_remote(names: list[str], backend: dict, progress_cb=None) -> list[str]:
    """Generate icons on a remote GPU server via SSH. Returns list of generated names."""
    if not ai_backend_ready(backend):
        return []

    ssh_key = _expand(backend["ssh_key_path"])
    ssh_target = f"{backend['ssh_user']}@{backend['ssh_host']}"
    remote_script = backend["remote_script_path"]
    remote_output = backend.get("remote_output_dir", "/tmp/claude-icons")

    prompts = {}
    for name in names:
        prompts[name] = _ollama_prompt(name, backend)
        if progress_cb:
            progress_cb(f"Prompt: {name}")

    prompts_file = ICON_CACHE / "prompts_temp.json"
    prompts_file.write_text(json.dumps(prompts, ensure_ascii=False), encoding="utf-8")

    subprocess.run(
        ["scp", "-i", ssh_key, str(prompts_file), f"{ssh_target}:/tmp/prompts.json"],
        capture_output=True, timeout=10,
    )

    if progress_cb:
        progress_cb(f"Running SD on {backend['ssh_host']}...")
    result = subprocess.run(
        ["ssh", "-i", ssh_key, "-o", "ConnectTimeout=5", ssh_target,
         f'python3 {remote_script} "$(cat /tmp/prompts.json)"'],
        capture_output=True, text=True, timeout=120,
    )

    generated = [line.split(":")[1] for line in result.stdout.splitlines() if line.startswith("OK:")]

    if generated:
        if progress_cb:
            progress_cb(f"Downloading {len(generated)} icons...")
        subprocess.run(
            ["scp", "-i", ssh_key, f"{ssh_target}:{remote_output}/*.png", str(ICON_CACHE) + "/"],
            capture_output=True, timeout=30,
        )

    prompts_file.unlink(missing_ok=True)
    return generated


# ── ProjectCard ───────────────────────────────────────────────

class ProjectCard(ctk.CTkFrame):
    def __init__(self, master, project_path: Path, on_select, on_double_click, **kwargs):
        super().__init__(master, **kwargs)
        self.project_path = project_path
        self.project_name = project_path.name
        self.on_select = on_select
        self.on_double_click = on_double_click
        self.selected = False
        self._default_fg = ("gray90", "gray20")
        self._hover_fg = ("gray85", "gray25")
        self._selected_fg = ("gray80", "gray28")

        self.configure(corner_radius=12, fg_color=self._default_fg, cursor="hand2")

        # Icon — cached AI or fallback
        cached = ICON_CACHE / f"{self.project_name}.png"
        if cached.exists():
            try:
                icon_img = Image.open(cached).resize((ICON_DISPLAY, ICON_DISPLAY), Image.LANCZOS)
            except Exception:
                icon_img = generate_fallback_icon(self.project_name, ICON_DISPLAY)
        else:
            icon_img = generate_fallback_icon(self.project_name, ICON_DISPLAY)

        self.icon_photo = ctk.CTkImage(light_image=icon_img, dark_image=icon_img, size=(ICON_DISPLAY, ICON_DISPLAY))
        self.icon_label = ctk.CTkLabel(self, image=self.icon_photo, text="")
        self.icon_label.pack(pady=(10, 3))

        # Name
        display = self.project_name[:14] + ".." if len(self.project_name) > 16 else self.project_name
        self.name_label = ctk.CTkLabel(self, text=display, font=("Segoe UI", 11, "bold"))
        self.name_label.pack(pady=(0, 2))

        # Session status
        text, color = last_session_text(project_path)
        self.status_label = ctk.CTkLabel(self, text=text, font=("Segoe UI", 9), text_color=color)
        self.status_label.pack(pady=(0, 8))

        for w in (self, self.icon_label, self.name_label, self.status_label):
            w.bind("<Button-1>", lambda e: self.on_select(self))
            w.bind("<Double-Button-1>", lambda e: self.on_double_click(self))
            w.bind("<Enter>", lambda e: self._on_hover(True))
            w.bind("<Leave>", lambda e: self._on_hover(False))

    def update_icon(self, img: Image.Image) -> None:
        resized = img.resize((ICON_DISPLAY, ICON_DISPLAY), Image.LANCZOS)
        self.icon_photo = ctk.CTkImage(light_image=resized, dark_image=resized, size=(ICON_DISPLAY, ICON_DISPLAY))
        self.icon_label.configure(image=self.icon_photo)

    def _on_hover(self, entering: bool) -> None:
        if not self.selected:
            self.configure(fg_color=self._hover_fg if entering else self._default_fg)

    def set_selected(self, selected: bool) -> None:
        self.selected = selected
        if selected:
            self.configure(fg_color=self._selected_fg, border_width=2, border_color="#3B82F6")
        else:
            self.configure(fg_color=self._default_fg, border_width=0)


# ── Main App ──────────────────────────────────────────────────

class ClaudeLauncher(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Claude Launcher")
        self.geometry("1000x700")
        self.minsize(800, 550)

        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        self.selected_project: Path | None = None
        self.project_cards: list[ProjectCard] = []
        self.all_projects: list[Path] = []
        self.config = load_config()
        self._icon_executor = ThreadPoolExecutor(max_workers=3)
        self._card_map: dict[str, ProjectCard] = {}
        self._icons_pending = 0

        ICON_CACHE.mkdir(exist_ok=True)

        self._build_ui()
        self._scan_projects()
        self._render_projects()
        self._restore_last_project()
        self._start_icon_generation()

        self.bind("<Return>", lambda e: self._launch())
        self.bind("<Escape>", lambda e: self._deselect())

    def destroy(self):
        self._icon_executor.shutdown(wait=False)
        super().destroy()

    # ── UI ────────────────────────────────────────────────────

    def _build_ui(self) -> None:
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(15, 5))
        ctk.CTkLabel(header, text="Claude Launcher", font=("Segoe UI", 24, "bold")).pack(side="left")

        btn_frame = ctk.CTkFrame(header, fg_color="transparent")
        btn_frame.pack(side="right")
        ctk.CTkButton(
            btn_frame, text="Regenerate icons", width=140, height=30,
            font=("Segoe UI", 11), fg_color="gray30", hover_color="gray40",
            command=self._regenerate_icons,
        ).pack(side="left", padx=5)
        ctk.CTkButton(
            btn_frame, text="Desktop shortcut", width=140, height=30,
            font=("Segoe UI", 11), fg_color="gray30", hover_color="gray40",
            command=self._create_desktop_shortcut,
        ).pack(side="left", padx=5)

        # Search
        sf = ctk.CTkFrame(self, fg_color="transparent")
        sf.pack(fill="x", padx=20, pady=(5, 5))
        self.search_var = ctk.StringVar()
        self.search_var.trace_add("write", lambda *_: self._filter_projects())
        self.search_entry = ctk.CTkEntry(
            sf, placeholder_text="Search projects...",
            textvariable=self.search_var, height=35, font=("Segoe UI", 13),
        )
        self.search_entry.pack(fill="x")

        # Body
        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, padx=20, pady=(5, 5))

        left = ctk.CTkFrame(body, fg_color="transparent")
        left.pack(side="left", fill="both", expand=True)
        self.project_count_label = ctk.CTkLabel(left, text="", font=("Segoe UI", 11), text_color="gray55")
        self.project_count_label.pack(anchor="w", pady=(0, 5))
        self.empty_label = ctk.CTkLabel(
            left, text="", font=("Segoe UI", 11), text_color="#F8C471", wraplength=600,
        )
        self.empty_label.pack(anchor="w", pady=(0, 5))
        self.scroll = ctk.CTkScrollableFrame(left, fg_color="transparent")
        self.scroll.pack(fill="both", expand=True)
        self.grid_frame = ctk.CTkFrame(self.scroll, fg_color="transparent")
        self.grid_frame.pack(fill="both", expand=True)

        self.panel = ctk.CTkFrame(body, width=280, corner_radius=12)
        self.panel.pack(side="right", fill="y", padx=(15, 0))
        self.panel.pack_propagate(False)
        self._build_panel()

        self.status_bar = ctk.CTkLabel(
            self, text="Double click = launch | Enter = open | Esc = deselect",
            font=("Segoe UI", 10), text_color="gray45", height=25,
        )
        self.status_bar.pack(fill="x", padx=20, pady=(0, 8))

    def _build_panel(self) -> None:
        px = {"padx": 20}
        defaults = self.config.get("default_options", DEFAULT_CONFIG["default_options"])

        self.proj_title = ctk.CTkLabel(self.panel, text="No project selected", font=("Segoe UI", 16, "bold"), wraplength=240)
        self.proj_title.pack(pady=(20, 10), **px)
        self.proj_path_label = ctk.CTkLabel(self.panel, text="", font=("Segoe UI", 9), text_color="gray50", wraplength=240)
        self.proj_path_label.pack(pady=(0, 10), **px)

        ctk.CTkFrame(self.panel, height=1, fg_color="gray40").pack(fill="x", **px, pady=5)

        ctk.CTkLabel(self.panel, text="Session", font=("Segoe UI", 12, "bold")).pack(anchor="w", pady=(12, 5), **px)
        self.session_var = ctk.StringVar(value=defaults.get("session", "continue"))
        for text, val in [("Continue last", "continue"), ("New conversation", "new"), ("Resume previous", "resume")]:
            ctk.CTkRadioButton(self.panel, text=text, variable=self.session_var, value=val, font=("Segoe UI", 12)).pack(anchor="w", pady=2, **px)

        ctk.CTkFrame(self.panel, height=1, fg_color="gray40").pack(fill="x", **px, pady=8)

        ctk.CTkLabel(self.panel, text="Options", font=("Segoe UI", 12, "bold")).pack(anchor="w", pady=(5, 5), **px)
        self.skip_var = ctk.BooleanVar(value=defaults.get("skip_perms", True))
        ctk.CTkCheckBox(self.panel, text="Skip permissions", variable=self.skip_var, font=("Segoe UI", 12)).pack(anchor="w", pady=2, **px)
        self.voice_var = ctk.BooleanVar(value=defaults.get("voice", False))
        ctk.CTkCheckBox(self.panel, text="Voice mode", variable=self.voice_var, font=("Segoe UI", 12)).pack(anchor="w", pady=2, **px)

        ctk.CTkFrame(self.panel, height=1, fg_color="gray40").pack(fill="x", **px, pady=8)

        ctk.CTkLabel(self.panel, text="Model", font=("Segoe UI", 12, "bold")).pack(anchor="w", pady=(5, 5), **px)
        self.model_var = ctk.StringVar(value=defaults.get("model", "opus"))
        ctk.CTkOptionMenu(self.panel, values=["opus", "sonnet", "haiku"], variable=self.model_var, font=("Segoe UI", 12), width=200).pack(anchor="w", **px, pady=2)

        ctk.CTkLabel(self.panel, text="Effort", font=("Segoe UI", 12, "bold")).pack(anchor="w", pady=(10, 5), **px)
        self.effort_var = ctk.StringVar(value=defaults.get("effort", "max"))
        ctk.CTkOptionMenu(self.panel, values=["low", "medium", "high", "max"], variable=self.effort_var, font=("Segoe UI", 12), width=200).pack(anchor="w", **px, pady=2)

        self.launch_btn = ctk.CTkButton(self.panel, text="Open Project", font=("Segoe UI", 14, "bold"), height=48, corner_radius=10, command=self._launch, state="disabled")
        self.launch_btn.pack(side="bottom", fill="x", **px, pady=(10, 15))

        self.folder_btn = ctk.CTkButton(self.panel, text="Open folder", font=("Segoe UI", 11), height=32, corner_radius=8, fg_color="gray30", hover_color="gray40", command=self._open_folder, state="disabled")
        self.folder_btn.pack(side="bottom", fill="x", **px, pady=(0, 5))

    # ── Projects ──────────────────────────────────────────────

    def _scan_projects(self) -> None:
        root = projects_dir(self.config)
        if not root.exists():
            self.all_projects = []
            return
        self.all_projects = sorted(
            [d for d in root.iterdir() if d.is_dir() and d.name not in EXCLUDED_DIRS and not d.name.startswith(".")],
            key=project_sort_key,
        )

    def _render_projects(self, filter_text: str = "") -> None:
        for card in self.project_cards:
            card.destroy()
        self.project_cards.clear()
        self._card_map.clear()

        filtered = [p for p in self.all_projects if filter_text.lower() in p.name.lower()]
        self.project_count_label.configure(text=f"{len(filtered)} projects")

        if not self.all_projects:
            root = projects_dir(self.config)
            self.empty_label.configure(
                text=(
                    f"No projects found in: {root}\n"
                    f"Edit projects_dir in config.json to point to your code folder, then restart."
                ),
            )
        else:
            self.empty_label.configure(text="")

        cols = 4
        for i, proj in enumerate(filtered):
            row, col = divmod(i, cols)
            card = ProjectCard(self.grid_frame, proj, on_select=self._select, on_double_click=self._quick_launch)
            card.grid(row=row, column=col, padx=6, pady=6, sticky="nsew")
            self.project_cards.append(card)
            self._card_map[proj.name] = card

        for c in range(cols):
            self.grid_frame.columnconfigure(c, weight=1)

    def _filter_projects(self) -> None:
        self._render_projects(self.search_var.get())

    def _restore_last_project(self) -> None:
        last = self.config.get("last_project", "")
        if last and last in self._card_map:
            self._select(self._card_map[last])

    # ── AI Icon generation (background via server) ─────────────

    def _start_icon_generation(self) -> None:
        backend = self.config.get("ai_backend", {})
        if not ai_backend_ready(backend):
            return
        need = [p for p in self.all_projects if not (ICON_CACHE / f"{p.name}.png").exists()]
        if not need:
            return
        host = backend.get("ssh_host", "remote")
        self.status_bar.configure(
            text=f"Generating {len(need)} icons on {host}...", text_color="#F8C471",
        )
        self._icon_executor.submit(self._remote_gen_worker, [p.name for p in need])

    def _remote_gen_worker(self, names: list[str]) -> None:
        backend = self.config.get("ai_backend", {})

        def progress(msg: str):
            self.after(0, lambda: self.status_bar.configure(text=msg, text_color="#F8C471"))

        try:
            generated = generate_icons_remote(names, backend, progress_cb=progress)
            self.after(0, self._on_batch_complete, generated)
        except Exception as e:
            self.after(0, lambda: self.status_bar.configure(
                text=f"Icon generation error: {e}", text_color="#E17055",
            ))

    def _on_batch_complete(self, generated: list[str]) -> None:
        for name in generated:
            card = self._card_map.get(name)
            if card:
                cache = ICON_CACHE / f"{name}.png"
                if cache.exists():
                    try:
                        card.update_icon(Image.open(cache))
                    except Exception:
                        pass
        self.status_bar.configure(
            text=f"{len(generated)} icons generated", text_color="#4ECDC4",
        )

    def _regenerate_icons(self) -> None:
        for f in ICON_CACHE.glob("*.png"):
            f.unlink()
        for card in self.project_cards:
            card.update_icon(generate_fallback_icon(card.project_name, ICON_RENDER))
        if not ai_backend_ready(self.config.get("ai_backend", {})):
            self.status_bar.configure(
                text="Icons regenerated (fallback). Configure ai_backend in config.json for AI icons.",
                text_color="#82E0AA",
            )
            return
        self._start_icon_generation()

    # ── Selection ─────────────────────────────────────────────

    def _select(self, card: ProjectCard) -> None:
        for c in self.project_cards:
            c.set_selected(False)
        card.set_selected(True)
        self.selected_project = card.project_path
        self.proj_title.configure(text=card.project_name)
        self.proj_path_label.configure(text=str(card.project_path))
        self.launch_btn.configure(state="normal")
        self.folder_btn.configure(state="normal")

        saved = self.config.get("projects", {}).get(card.project_name, {})
        defaults = self.config.get("default_options", DEFAULT_CONFIG["default_options"])
        self.session_var.set(saved.get("session", defaults.get("session", "continue")))
        self.skip_var.set(saved.get("skip_perms", defaults.get("skip_perms", True)))
        self.voice_var.set(saved.get("voice", defaults.get("voice", False)))
        self.model_var.set(saved.get("model", defaults.get("model", "opus")))
        self.effort_var.set(saved.get("effort", defaults.get("effort", "max")))

    def _deselect(self) -> None:
        for c in self.project_cards:
            c.set_selected(False)
        self.selected_project = None
        self.proj_title.configure(text="No project selected")
        self.proj_path_label.configure(text="")
        self.launch_btn.configure(state="disabled")
        self.folder_btn.configure(state="disabled")

    # ── Launch ────────────────────────────────────────────────

    def _build_cmd(self) -> str:
        parts = ["claude"]
        mode = self.session_var.get()
        if mode == "continue":
            parts.append("--continue")
        elif mode == "resume":
            parts.append("--resume")
        if self.skip_var.get():
            parts.append("--dangerously-skip-permissions")
        parts.extend(["--model", self.model_var.get()])
        parts.extend(["--effort", self.effort_var.get()])
        return " ".join(parts)

    def _save_project_settings(self) -> None:
        if not self.selected_project:
            return
        name = self.selected_project.name
        if "projects" not in self.config:
            self.config["projects"] = {}
        self.config["projects"][name] = {
            "session": self.session_var.get(),
            "skip_perms": self.skip_var.get(),
            "voice": self.voice_var.get(),
            "model": self.model_var.get(),
            "effort": self.effort_var.get(),
        }
        self.config["last_project"] = name
        save_config(self.config)

    def _launch(self) -> None:
        if not self.selected_project:
            return
        self._save_project_settings()
        escaped = str(self.selected_project).replace("/", "\\")
        subprocess.Popen(f'wt -d "{escaped}" cmd.exe /k "{self._build_cmd()}"', shell=True)
        self.status_bar.configure(text=f"Lanzado: {self.selected_project.name} ({self.model_var.get()})", text_color="#4ECDC4")

    def _quick_launch(self, card: ProjectCard) -> None:
        self._select(card)
        self._launch()

    def _open_folder(self) -> None:
        if self.selected_project:
            os.startfile(str(self.selected_project))

    # ── Desktop shortcut ──────────────────────────────────────

    def _create_desktop_shortcut(self) -> None:
        result = subprocess.run(["powershell", "-Command", "[Environment]::GetFolderPath('Desktop')"], capture_output=True, text=True)
        desktop = Path(result.stdout.strip())
        lp = Path(__file__).resolve()
        ps = f'$ws=New-Object -ComObject WScript.Shell;$s=$ws.CreateShortcut("{desktop}\\Claude Launcher.lnk");$s.TargetPath="pythonw.exe";$s.Arguments=\'"{lp}"\';$s.WorkingDirectory="{lp.parent}";$s.Save()'
        subprocess.run(["powershell", "-Command", ps], capture_output=True)
        self.status_bar.configure(text="Acceso directo creado en escritorio", text_color="#4ECDC4")


if __name__ == "__main__":
    app = ClaudeLauncher()
    app.mainloop()
