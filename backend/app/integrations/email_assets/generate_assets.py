"""Genera los GIF animados del correo (logo Vincula y tracker de fases). Ejecutar una sola vez:
python generate_assets.py
Los archivos resultantes se adjuntan inline (cid) en cada correo, sin depender de hosting externo."""
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = r"C:\Windows\Fonts"
INK = (0, 26, 35)
LIME = (177, 204, 116)
GREEN = (51, 111, 36)
LINE = (220, 228, 230)
MUTED = (113, 129, 136)
WHITE = (255, 255, 255)
S = 2  # supersampling


def font(name, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size * S)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def save_gif(frames, path, duration):
    pal = [f.convert("RGB").quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames]
    pal[0].save(path, save_all=True, append_images=pal[1:], duration=duration, loop=0, optimize=True, disposal=1)


def make_logo():
    w, h = 300, 64
    f = font("segoeuib.ttf", 40)
    text = "Vincula"
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    widths = [probe.textlength(c, font=f) for c in text]
    total = sum(widths)
    x0 = (w * S - total) / 2 - 4 * S
    n = 24
    frames = []
    for k in range(n):
        im = Image.new("RGB", (w * S, h * S), INK)
        d = ImageDraw.Draw(im)
        pos = (k / n) * (len(text) + 4) - 2  # onda de brillo que recorre las letras
        x = x0
        for i, c in enumerate(text):
            t = max(0.0, 1 - abs(i - pos) / 1.6)
            col = mix(WHITE, LIME, t)
            dy = -int(5 * S * t)
            d.text((x, 6 * S + dy), c, font=f, fill=col)
            x += widths[i]
        # punto lima final
        r = 5 * S
        cx, cy = x + 8 * S, 46 * S
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=LIME)
        # línea inferior que crece
        prog = min(1.0, (k + 1) / (n * 0.6))
        lw = total * prog
        d.rounded_rectangle((x0, 58 * S, x0 + lw, 61 * S), radius=2 * S, fill=GREEN)
        frames.append(im.resize((w, h), Image.LANCZOS))
    save_gif(frames, os.path.join(OUT, "vincula_logo.gif"), 70)


LABELS = ["Revisión", "Preselección", "Prueba técnica", "Entrevista", "Oferta"]


def make_stage(idx):
    w, h = 560, 120
    lf = font("segoeui.ttf", 12)
    lb = font("segoeuib.ttf", 12)
    n = 12
    frames = []
    xs = [int(w * (0.1 + 0.2 * i)) for i in range(5)]
    cy = 34
    for k in range(n):
        im = Image.new("RGB", (w * S, h * S), WHITE)
        d = ImageDraw.Draw(im)
        # línea base y progreso
        d.rounded_rectangle((xs[0] * S, (cy - 2) * S, xs[-1] * S, (cy + 2) * S), radius=2 * S, fill=LINE)
        d.rounded_rectangle((xs[0] * S, (cy - 2) * S, xs[idx] * S, (cy + 2) * S), radius=2 * S, fill=GREEN)
        pulse = (math.sin(2 * math.pi * k / n) + 1) / 2
        for i, x in enumerate(xs):
            X, Y = x * S, cy * S
            if i < idx:
                r = 14 * S
                d.ellipse((X - r, Y - r, X + r, Y + r), fill=GREEN)
                d.line([(X - 6 * S, Y), (X - 2 * S, Y + 5 * S), (X + 7 * S, Y - 5 * S)], fill=WHITE, width=3 * S, joint="curve")
            elif i == idx:
                halo = (16 + 7 * pulse) * S
                d.ellipse((X - halo, Y - halo, X + halo, Y + halo), fill=mix(WHITE, LIME, 0.55 - 0.25 * pulse))
                r = 14 * S
                d.ellipse((X - r, Y - r, X + r, Y + r), fill=GREEN)
                d.ellipse((X - 5 * S, Y - 5 * S, X + 5 * S, Y + 5 * S), fill=WHITE)
            else:
                r = 12 * S
                d.ellipse((X - r, Y - r, X + r, Y + r), fill=WHITE, outline=LINE, width=3 * S)
            fnt = lb if i == idx else lf
            col = INK if i <= idx else MUTED
            tw = d.textlength(LABELS[i], font=fnt)
            d.text((X - tw / 2, 62 * S), LABELS[i], font=fnt, fill=col)
        tag = f"Fase {idx + 1} de 5"
        ff = font("segoeuib.ttf", 11)
        tw = d.textlength(tag, font=ff)
        X = xs[idx] * S
        pw, ph = tw + 20 * S, 22 * S
        px0 = X - pw / 2
        px0 = max(2 * S, min(px0, w * S - pw - 2 * S))
        d.rounded_rectangle((px0, 86 * S, px0 + pw, 86 * S + ph), radius=11 * S, fill=GREEN)
        d.text((px0 + 10 * S, 86 * S + 3 * S), tag, font=ff, fill=WHITE)
        frames.append(im.resize((w, h), Image.LANCZOS))
    save_gif(frames, os.path.join(OUT, f"vincula_fase_{idx + 1}.gif"), 120)


if __name__ == "__main__":
    make_logo()
    for i in range(5):
        make_stage(i)
    print("ok", os.listdir(OUT))

