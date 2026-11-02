"""Generate a pack of raw motion-graphics elements (shapes and lines) as MP4 clips.

Each clip is 1920x1080, 30 fps, white elements on a pure black background,
so it can be layered over footage with the "Screen" / "Add" blend mode.

Usage: python3 scripts/generate_motion.py [output_dir]
"""

import math
import random
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

W, H = 1920, 1080
FPS = 30
SS = 2  # supersampling factor for smooth edges
WHITE = (255, 255, 255)
ACCENT = (255, 196, 0)


# ---------- easing ----------
def clamp(x):
    return max(0.0, min(1.0, x))


def ease_out_cubic(t):
    t = clamp(t)
    return 1 - (1 - t) ** 3


def ease_in_out_cubic(t):
    t = clamp(t)
    return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_out_back(t):
    t = clamp(t)
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2


def seg(t, start, end):
    """Local progress of t inside [start, end]."""
    return clamp((t - start) / (end - start))


# ---------- drawing helpers (coords in output pixels, scaled by SS) ----------
def s(v):
    return v * SS


def ring(d, cx, cy, r, width, color):
    if r <= 0 or width <= 0:
        return
    d.ellipse([s(cx - r), s(cy - r), s(cx + r), s(cy + r)], outline=color, width=max(1, int(s(width))))


def disc(d, cx, cy, r, color):
    if r <= 0:
        return
    d.ellipse([s(cx - r), s(cy - r), s(cx + r), s(cy + r)], fill=color)


def line(d, x1, y1, x2, y2, width, color):
    if width <= 0:
        return
    d.line([s(x1), s(y1), s(x2), s(y2)], fill=color, width=max(1, int(s(width))))
    # round caps
    disc(d, x1, y1, width / 2, color)
    disc(d, x2, y2, width / 2, color)


def polygon_points(cx, cy, r, n, rot):
    return [
        (s(cx + r * math.cos(rot + 2 * math.pi * i / n)), s(cy + r * math.sin(rot + 2 * math.pi * i / n)))
        for i in range(n)
    ]


def fade(color, a):
    a = clamp(a)
    return tuple(int(c * a) for c in color)


# ---------- clips ----------
def clip_ring_burst(t):
    """Concentric rings expanding from center with a pulse dot."""
    img = Image.new("RGB", (s(W), s(H)), "black")
    d = ImageDraw.Draw(img)
    cx, cy = W / 2, H / 2
    p = ease_out_back(seg(t, 0.0, 0.15)) * (1 - ease_in_out_cubic(seg(t, 0.55, 0.8)))
    disc(d, cx, cy, 40 * p, ACCENT)
    for i in range(4):
        k = seg(t, 0.05 + i * 0.08, 0.6 + i * 0.08)
        r = 60 + 520 * ease_out_cubic(k)
        w = 14 * (1 - k)
        ring(d, cx, cy, r, w, fade(WHITE, 1 - k ** 2))
    return img


def clip_line_sweep(t):
    """Horizontal lines draw in from the left, hold, then retract to the right."""
    img = Image.new("RGB", (s(W), s(H)), "black")
    d = ImageDraw.Draw(img)
    n = 7
    for i in range(n):
        y = H / 2 + (i - (n - 1) / 2) * 70
        delay = i * 0.04
        a = ease_in_out_cubic(seg(t, 0.0 + delay, 0.35 + delay))
        b = ease_in_out_cubic(seg(t, 0.6 + delay, 0.95))
        x1 = 200 + (W - 400) * b
        x2 = 200 + (W - 400) * a
        if x2 > x1 + 1:
            line(d, x1, y, x2, y, 10, ACCENT if i == n // 2 else WHITE)
    return img


def clip_shape_pop(t):
    """Triangle, square, circle and hexagon pop in with rotation, then shrink out."""
    img = Image.new("RGB", (s(W), s(H)), "black")
    d = ImageDraw.Draw(img)
    shapes = [(3, -math.pi / 2), (4, math.pi / 4), (0, 0), (6, 0)]
    for i, (n, base_rot) in enumerate(shapes):
        cx = W / 2 + (i - 1.5) * 380
        cy = H / 2
        pin = ease_out_back(seg(t, 0.05 + i * 0.07, 0.35 + i * 0.07))
        pout = ease_in_out_cubic(seg(t, 0.7 + i * 0.04, 0.9 + i * 0.025))
        scale = pin * (1 - pout)
        if scale <= 0.001:
            continue
        r = 120 * scale
        rot = base_rot + (1 - pin) * math.pi + pout * math.pi / 2
        color = ACCENT if i % 2 else WHITE
        if n == 0:
            ring(d, cx, cy, r, 16 * scale, color)
        else:
            pts = polygon_points(cx, cy, r, n, rot)
            d.line(pts + [pts[0]], fill=color, width=max(1, int(s(16 * scale))), joint="curve")
    return img


def clip_dot_wave(t):
    """Grid of dots rippling in size from the center outward."""
    img = Image.new("RGB", (s(W), s(H)), "black")
    d = ImageDraw.Draw(img)
    cols, rows, gap = 21, 11, 80
    ox = W / 2 - (cols - 1) * gap / 2
    oy = H / 2 - (rows - 1) * gap / 2
    appear = ease_out_cubic(seg(t, 0.0, 0.2)) * (1 - ease_in_out_cubic(seg(t, 0.85, 1.0)))
    for cxi in range(cols):
        for ryi in range(rows):
            x = ox + cxi * gap
            y = oy + ryi * gap
            dist = math.hypot(x - W / 2, y - H / 2) / 900
            wave = 0.5 + 0.5 * math.sin(2 * math.pi * (t * 2 - dist * 1.5))
            r = (4 + 14 * wave) * appear
            disc(d, x, y, r, ACCENT if wave > 0.92 else WHITE)
    return img


def clip_bar_wipe(t):
    """Diagonal bars wipe across the frame: a full-screen transition matte."""
    img = Image.new("RGB", (s(W), s(H)), "black")
    d = ImageDraw.Draw(img)
    n = 8
    bar = (W + H) / n
    for i in range(n):
        delay = i * 0.03
        # all bars are fully in by t=0.56, frame is fully covered until t=0.6
        a = ease_in_out_cubic(seg(t, 0.0 + delay, 0.35 + delay))
        b = ease_in_out_cubic(seg(t, 0.6 + delay, 0.78 + delay))
        # bar i covers the diagonal band, grows along its length from a to b
        x0 = -H + i * bar
        start = (W + H) * b
        end = (W + H) * a
        if end <= start:
            continue
        pts = [
            (x0 + start, start), (x0 + bar + start, start),
            (x0 + bar + end, end), (x0 + end, end),
        ]
        d.polygon([(s(px), s(py)) for px, py in pts], fill=ACCENT if i % 2 else WHITE)
    return img


_rng = random.Random(7)
_SPARKS = [(_rng.uniform(0, 2 * math.pi), _rng.uniform(250, 650), _rng.uniform(4, 12), _rng.uniform(0, 0.12))
           for _ in range(40)]


def clip_spark_burst(t):
    """Radial streaks burst out from the center like a firework."""
    img = Image.new("RGB", (s(W), s(H)), "black")
    d = ImageDraw.Draw(img)
    cx, cy = W / 2, H / 2
    for i, (ang, dist, width, delay) in enumerate(_SPARKS):
        k = seg(t, delay, 0.7 + delay)
        if k <= 0 or k >= 1:
            continue
        head = 40 + dist * ease_out_cubic(k)
        tail = 40 + dist * ease_out_cubic(clamp(k - 0.18) / 0.82) if k > 0.18 else 40
        x1, y1 = cx + tail * math.cos(ang), cy + tail * math.sin(ang)
        x2, y2 = cx + head * math.cos(ang), cy + head * math.sin(ang)
        line(d, x1, y1, x2, y2, width * (1 - k), ACCENT if i % 3 == 0 else WHITE)
    flash = 1 - ease_out_cubic(seg(t, 0.0, 0.25))
    disc(d, cx, cy, 70 * flash, fade(WHITE, flash))
    return img


CLIPS = [
    ("01_ring_burst", clip_ring_burst, 3.0),
    ("02_line_sweep", clip_line_sweep, 3.0),
    ("03_shape_pop", clip_shape_pop, 3.5),
    ("04_dot_wave", clip_dot_wave, 4.0),
    ("05_bar_wipe_transition", clip_bar_wipe, 2.0),
    ("06_spark_burst", clip_spark_burst, 2.5),
]


def render(name, fn, seconds, out_dir):
    frames = int(seconds * FPS)
    out = out_dir / f"{name}.mp4"
    proc = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
         "-movflags", "+faststart", str(out)],
        stdin=subprocess.PIPE,
    )
    for f in range(frames):
        t = f / (frames - 1)
        frame = fn(t).resize((W, H), Image.LANCZOS)
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    proc.wait()
    if proc.returncode != 0:
        raise SystemExit(f"ffmpeg failed for {name}")
    print(f"wrote {out}")
    return out


def main():
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "motion")
    out_dir.mkdir(parents=True, exist_ok=True)
    outs = [render(name, fn, sec, out_dir) for name, fn, sec in CLIPS]
    # contact sheet preview of all clips back to back
    listfile = out_dir / "_list.txt"
    listfile.write_text("".join(f"file '{o.name}'\n" for o in outs))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", str(listfile), "-c", "copy", str(out_dir / "00_all_elements.mp4")], check=True)
    listfile.unlink()
    print(f"wrote {out_dir / '00_all_elements.mp4'}")


if __name__ == "__main__":
    main()
