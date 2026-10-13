"""Top-down hover-robot mockup. Hull, band, and mark use the three kit colors."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 860
img = Image.new("RGBA", (W, H), (7, 11, 24, 255))
d = ImageDraw.Draw(img)

font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
font_m = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
font_s = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ellipse(box, fill=None, outline=None, width=1):
    d.ellipse(box, fill=fill, outline=outline, width=width)


def robot(cx, cy, role, kit, you=False, visor=0, antenna=0, facing=1):
    primary, secondary, tertiary = kit
    sign = 1 if facing >= 0 else -1

    if role == "attacker":
        hw, hh, skirt_w, skirt_h, nose = 22, 18, 28, 10, 30
    elif role == "mid":
        hw, hh, skirt_w, skirt_h, nose = 28, 22, 36, 12, 16
    elif role == "defender":
        hw, hh, skirt_w, skirt_h, nose = 38, 26, 48, 14, 6
    else:
        hw, hh, skirt_w, skirt_h, nose = 36, 30, 56, 16, 4

    ellipse((cx - skirt_w * 0.75, cy + 18, cx + skirt_w * 0.75, cy + 32), fill=(0, 0, 0, 80))
    ellipse((cx - skirt_w, cy + 4, cx + skirt_w, cy + 4 + skirt_h * 2.1), fill=secondary + (255,))
    ellipse((cx - skirt_w + 7, cy + 9, cx + skirt_w - 7, cy + 6 + skirt_h * 1.55), fill=mix(secondary, (0, 0, 0), 0.42) + (255,))

    if role == "goalie":
        body = [
            (cx - hw * sign, cy - hh),
            (cx + hw * 0.15 * sign, cy - hh),
            (cx + (hw + 8) * sign, cy - hh * 0.55),
            (cx + (hw + 12) * sign, cy),
            (cx + (hw + 8) * sign, cy + hh * 0.55),
            (cx + hw * 0.15 * sign, cy + hh),
            (cx - hw * sign, cy + hh),
        ]
    elif role == "defender":
        body = [
            (cx - hw * sign, cy - hh * 0.62),
            (cx - hw * 0.15 * sign, cy - hh),
            (cx + hw * 0.55 * sign, cy - hh * 0.9),
            (cx + (hw + nose) * sign, cy - 10),
            (cx + (hw + nose) * sign, cy + 10),
            (cx + hw * 0.55 * sign, cy + hh * 0.9),
            (cx - hw * 0.15 * sign, cy + hh),
            (cx - hw * sign, cy + hh * 0.62),
        ]
    else:
        body = [
            (cx - hw * 0.9 * sign, cy - hh),
            (cx + hw * 0.05 * sign, cy - hh * 0.95),
            (cx + (hw * 0.25 + nose) * sign, cy - (3 if role == "attacker" else 8)),
            (cx + (hw * 0.15 + nose) * sign, cy),
            (cx + (hw * 0.25 + nose) * sign, cy + (3 if role == "attacker" else 8)),
            (cx + hw * 0.05 * sign, cy + hh * 0.95),
            (cx - hw * 0.9 * sign, cy + hh),
        ]
    d.polygon(body, fill=primary + (255,))

    d.polygon(
        [
            (cx - hw * 0.45 * sign, cy - 5),
            (cx + hw * 0.35 * sign, cy - 5),
            (cx + hw * 0.35 * sign, cy + 5),
            (cx - hw * 0.45 * sign, cy + 5),
        ],
        fill=secondary + (255,),
    )

    tipx = cx + hw * 0.62 * sign
    d.polygon(
        [(tipx - 9 * sign, cy - 6), (tipx + 7 * sign, cy), (tipx - 9 * sign, cy + 6)],
        fill=tertiary + (255,),
    )

    vx = cx - hw * 0.22 * sign
    vy = cy - hh * 0.42
    if visor == 0:
        d.rounded_rectangle((vx - 12, vy, vx + 12, vy + 7), radius=2, fill=tertiary + (255,))
    elif visor == 1:
        ellipse((vx - 7, vy - 2, vx + 7, vy + 12), fill=tertiary + (255,))
    else:
        ellipse((vx - 13, vy, vx - 1, vy + 11), fill=tertiary + (255,))
        ellipse((vx + 1, vy, vx + 13, vy + 11), fill=tertiary + (255,))

    stem = mix(tertiary, (255, 255, 255), 0.25) + (255,)
    tip = tertiary + (255,)
    top = cy - hh + 1
    if antenna == 1:
        d.line((cx - 8, top, cx - 16, top - 18), fill=stem, width=3)
        d.line((cx + 8, top, cx + 16, top - 18), fill=stem, width=3)
        ellipse((cx - 20, top - 24, cx - 12, top - 16), fill=tip)
        ellipse((cx + 12, top - 24, cx + 20, top - 16), fill=tip)
    elif antenna == 2:
        d.line((cx - 8, top, cx, top - 20), fill=stem, width=3)
        d.line((cx + 8, top, cx, top - 20), fill=stem, width=3)
        ellipse((cx - 5, top - 28, cx + 5, top - 18), fill=tip)
    elif antenna == 3:
        d.line((cx + 2, top, cx + 16, top - 18), fill=stem, width=3)
        ellipse((cx + 12, top - 26, cx + 22, top - 16), fill=tip)
    else:
        d.line((cx, top, cx, top - 18), fill=stem, width=3)
        ellipse((cx - 4, top - 26, cx + 4, top - 18), fill=tip)

    if role == "goalie":
        px = cx + 8 * sign
        d.rounded_rectangle((px - 18, cy + 12, px + 18, cy + 20), radius=3, fill=tertiary + (255,))

    if you:
        reach = hw + nose + 18
        ellipse((cx - reach, cy - hh - 16, cx + reach, cy + hh + 16), outline=(255, 214, 90, 255), width=4)


d.rounded_rectangle((40, 150, W - 40, 500), radius=18, fill=(12, 28, 48, 255))
d.rounded_rectangle((40, 150, W - 40, 500), radius=18, outline=(90, 150, 180, 160), width=2)

d.text((56, 28), "PLAYER MODELS", fill=(244, 247, 255, 255), font=font)
d.text((56, 70), "Hull is primary.   Band and skirt are secondary.   Visor, chevron, and antenna are tertiary.", fill=(186, 206, 224, 255), font=font_s)
d.text((56, 96), "The gold ring is only you.   The silhouette is the position.", fill=(140, 165, 190, 255), font=font_s)

home = ((32, 176, 196), (58, 104, 186), (255, 196, 72))
away = ((206, 54, 122), (118, 62, 184), (255, 122, 64))
ink = ((32, 34, 38), (176, 180, 186), (246, 246, 248))

d.text((70, 168), "YOUR TEAM", fill=home[0] + (255,), font=font_m)
roles = [("attacker", "A  ATTACKER"), ("mid", "M  MID"), ("defender", "D  DEFENDER"), ("goalie", "G  GOALIE")]
xs = [150, 390, 650, 910]
for i, ((role, tag), x) in enumerate(zip(roles, xs)):
    robot(x, 310, role, home, you=(i == 0), visor=i % 3, antenna=i, facing=1)
    d.text((x - 52, 430), tag, fill=(236, 242, 250, 235), font=font_s)
d.text((118, 454), "YOU", fill=(255, 214, 90, 255), font=font_xs)

d.text((1088, 168), "OTHER", fill=away[0] + (255,), font=font_m)
robot(1148, 310, "attacker", away, visor=1, antenna=2, facing=-1)
d.text((1096, 430), "A  ATTACKER", fill=(236, 242, 250, 235), font=font_s)

d.text((56, 530), "THE THREE COLORS", fill=(244, 247, 255, 255), font=font_m)


def chip(x, y, color, label):
    d.rounded_rectangle((x, y, x + 26, y + 16), radius=4, fill=color + (255,))
    d.text((x + 36, y - 2), label, fill=(220, 230, 240, 255), font=font_s)


chip(56, 572, home[0], "PRIMARY    hull")
chip(300, 572, home[1], "SECONDARY    stripe and skirt")
chip(640, 572, home[2], "TERTIARY    visor, chevron, antenna")
chip(1020, 572, (255, 214, 90), "GOLD    you")

d.text((56, 620), "SAME JERSEY", fill=(244, 247, 255, 255), font=font_m)
d.text((230, 624), "Visor and antenna change. The colors do not.", fill=(160, 185, 205, 255), font=font_s)
labels = ("BAR VISOR", "ROUND VISOR", "SPLIT VISOR", "TWIN ANTENNA")
for i, label in enumerate(labels):
    robot(120 + i * 180, 730, "mid", home, visor=i % 3, antenna=i, facing=1)
    d.text((120 + i * 180 - 46, 800), label, fill=(200, 214, 230, 230), font=font_xs)

d.text((860, 620), "INK KIT", fill=(220, 224, 230, 255), font=font_m)
d.text((860, 650), "Black, gray, and white still read.", fill=(160, 185, 205, 255), font=font_s)
robot(980, 750, "defender", ink, visor=0, antenna=0, facing=1)
d.text((930, 818), "D  DEFENDER", fill=(220, 224, 230, 230), font=font_xs)

img.convert("RGB").save("/workspace/artifacts/robot-mockup.png", "PNG")
print("ok")
