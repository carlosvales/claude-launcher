#!/usr/bin/env python3
"""Generate Claude Launcher icons (PNG + ICO).

Design: rounded square with a violet-to-blue diagonal gradient, a white
curly-brace glyph centered, and a subtle amber sparkle accent. Reads
clearly at every size from 16px to 512px.

Run:
    python scripts/generate_icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_DIR = Path(__file__).resolve().parent.parent / "tauri" / "src-tauri" / "icons"

SIZES_PNG = [
    ("32x32.png", 32),
    ("128x128.png", 128),
    ("128x128@2x.png", 256),
    ("icon.png", 512),
]

SIZES_STORE = [
    ("Square30x30Logo.png", 30),
    ("Square44x44Logo.png", 44),
    ("Square71x71Logo.png", 71),
    ("Square89x89Logo.png", 89),
    ("Square107x107Logo.png", 107),
    ("Square142x142Logo.png", 142),
    ("Square150x150Logo.png", 150),
    ("Square284x284Logo.png", 284),
    ("Square310x310Logo.png", 310),
    ("StoreLogo.png", 50),
]

ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

# Tailwind orange-500 → red-500 (warm, vibrant, distinctive)
COLOR_TL = (0xF9, 0x73, 0x16)  # top-left, orange-500
COLOR_BR = (0xEF, 0x44, 0x44)  # bottom-right, red-500
ACCENT = (0x67, 0xE8, 0xF9)    # cyan-300, sparkle (contrast vs warm bg)


def diagonal_gradient(size: int, c1: tuple, c2: tuple) -> Image.Image:
    """Build a diagonal (TL→BR) gradient using two stretched lines."""
    base = Image.new("RGBA", (size, size))
    pixels = base.load()
    for y in range(size):
        for x in range(size):
            # Diagonal blend factor: 0 at top-left, 1 at bottom-right
            t = (x + y) / (2 * (size - 1)) if size > 1 else 0
            pixels[x, y] = (
                int(c1[0] + (c2[0] - c1[0]) * t),
                int(c1[1] + (c2[1] - c1[1]) * t),
                int(c1[2] + (c2[2] - c1[2]) * t),
                255,
            )
    return base


def find_bold_font(font_size: int, prefer_serif: bool = False) -> ImageFont.ImageFont:
    """Find a bold font that exists on the system."""
    serif = ["georgiab.ttf", "cambriab.ttf", "timesbd.ttf"]
    sans = ["segoeuib.ttf", "seguisb.ttf", "arialbd.ttf", "calibrib.ttf"]
    candidates = serif + sans if prefer_serif else sans + serif
    for name in candidates:
        try:
            return ImageFont.truetype(name, font_size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_sparkle(draw: ImageDraw.Draw, cx: int, cy: int, size: int, color: tuple) -> None:
    """4-point star sparkle (a tiny twinkle accent)."""
    s = size
    pts = [
        (cx, cy - s),       # top
        (cx + s * 0.3, cy - s * 0.3),
        (cx + s, cy),       # right
        (cx + s * 0.3, cy + s * 0.3),
        (cx, cy + s),       # bottom
        (cx - s * 0.3, cy + s * 0.3),
        (cx - s, cy),       # left
        (cx - s * 0.3, cy - s * 0.3),
    ]
    draw.polygon(pts, fill=color)


def render_icon(size: int) -> Image.Image:
    """Render the launcher icon at given pixel size, oversampled for AA."""
    scale = 4 if size <= 256 else 2
    s = size * scale

    # Background gradient (diagonal violet → blue)
    grad = diagonal_gradient(s, COLOR_TL, COLOR_BR)

    # Rounded square mask
    radius = int(s * 0.22)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, s - 1, s - 1], radius=radius, fill=255
    )

    icon = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    icon.paste(grad, mask=mask)

    # Soft top highlight (gives subtle 3D / glossy feel)
    highlight = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(highlight).rounded_rectangle(
        [int(s * 0.06), int(s * 0.06), int(s * 0.94), int(s * 0.48)],
        radius=int(s * 0.16),
        fill=(255, 255, 255, 26),
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(radius=s * 0.01))
    icon.alpha_composite(highlight)

    # Curly brace glyph (the dev-tool symbol)
    glyph_layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glyph_layer)
    font = find_bold_font(int(s * 0.78), prefer_serif=False)
    text = "{"

    bbox = gd.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (s - tw) // 2 - bbox[0]
    ty = (s - th) // 2 - bbox[1] - int(s * 0.01)

    # Drop shadow
    shadow_offset = max(1, int(s * 0.012))
    shadow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).text(
        (tx + shadow_offset, ty + shadow_offset),
        text,
        fill=(0, 0, 0, 90),
        font=font,
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=s * 0.008))
    glyph_layer.alpha_composite(shadow)

    # Main brace
    gd.text((tx, ty), text, fill=(255, 255, 255, 255), font=font)

    icon.alpha_composite(glyph_layer)

    # Sparkle accent (top-right) — only meaningful at >=64px
    if size >= 48:
        sparkle = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sparkle)
        spk_size = int(s * 0.06)
        cx = int(s * 0.78)
        cy = int(s * 0.24)
        # outer glow
        glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse(
            [cx - spk_size * 2, cy - spk_size * 2, cx + spk_size * 2, cy + spk_size * 2],
            fill=(*ACCENT, 80),
        )
        glow = glow.filter(ImageFilter.GaussianBlur(radius=s * 0.015))
        sparkle.alpha_composite(glow)
        # main star
        draw_sparkle(sd, cx, cy, spk_size, (*ACCENT, 255))
        # tiny center white dot for shine
        sd.ellipse(
            [cx - spk_size * 0.25, cy - spk_size * 0.25, cx + spk_size * 0.25, cy + spk_size * 0.25],
            fill=(255, 255, 255, 230),
        )
        # mask sparkle to icon shape (so it doesn't bleed beyond rounded corner)
        icon.alpha_composite(Image.composite(sparkle, Image.new("RGBA", (s, s), (0, 0, 0, 0)), mask))

    return icon.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output: {OUT_DIR}\n")

    print("PNG icons:")
    for name, sz in [*SIZES_PNG, *SIZES_STORE]:
        render_icon(sz).save(OUT_DIR / name, "PNG")
        print(f"  {name} ({sz}x{sz})")

    print("\nICO multi-resolution:")
    base = render_icon(256)
    base.save(OUT_DIR / "icon.ico", format="ICO", sizes=[(s, s) for s in ICO_SIZES])
    print(f"  icon.ico (sizes: {ICO_SIZES})")

    print("\nDone.")


if __name__ == "__main__":
    main()
