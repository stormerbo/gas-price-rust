"""
Liquid Precision — App Icon Generator v2
Refined fuel droplet with luminous depth and geometric precision.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math

SIZE = 1024
CENTER = SIZE // 2

def rounded_rect_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask

def radial_gradient(size, cx, cy, radius, color_inner, color_outer):
    """Create a smooth radial gradient."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    for y in range(size):
        for x in range(size):
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            t = min(dist / radius, 1.0)
            t = t * t  # ease-in for smoother falloff
            r = int(color_inner[0] + (color_outer[0] - color_inner[0]) * t)
            g = int(color_inner[1] + (color_outer[1] - color_inner[1]) * t)
            b = int(color_inner[2] + (color_outer[2] - color_inner[2]) * t)
            a = int(color_inner[3] + (color_outer[3] - color_inner[3]) * t)
            img.putpixel((x, y), (r, g, b, a))
    return img

mask = rounded_rect_mask(SIZE, 220)

# === Step 1: Rich dark background gradient ===
bg = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
for y in range(SIZE):
    t = y / SIZE
    r = int(6 + t * 8)
    g = int(12 + t * 16)
    b = int(36 + t * 30)
    for x in range(SIZE):
        bg.putpixel((x, y), (r, g, b, 255))
bg.putalpha(mask)
img = bg.copy()

# === Step 2: Ambient glow behind droplet ===
print("Generating ambient glow...")
glow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
gcx, gcy = CENTER, int(SIZE * 0.42)
for radius in range(400, 0, -2):
    t = radius / 400
    alpha = int(22 * (1 - t) ** 2.5)
    cr = int(15 + 40 * (1 - t))
    cg = int(60 + 120 * (1 - t))
    cb = int(160 + 80 * (1 - t))
    glow_draw.ellipse(
        [gcx - radius, gcy - int(radius * 1.1), gcx + radius, gcy + int(radius * 0.9)],
        fill=(cr, cg, cb, alpha)
    )
glow_masked = glow.copy()
glow_alpha = ImageChops.darker(glow.split()[3], mask)
glow_masked.putalpha(glow_alpha)
img = Image.alpha_composite(img, glow_masked)

# === Step 3: Droplet shape ===
def droplet_polygon(cx, cy, scale=1.0, y_offset=0):
    """Elegant teardrop/fuel-drop silhouette."""
    points_left = []
    top_y = cy - int(270 * scale) + y_offset
    bot_y = cy + int(230 * scale) + y_offset
    max_w = int(175 * scale)
    
    steps = 300
    for i in range(steps + 1):
        t = i / steps
        y = top_y + (bot_y - top_y) * t
        
        if t < 0.08:
            # Very tip: sharp point
            st = t / 0.08
            width = max_w * 0.02 * (st ** 0.5)
        elif t < 0.4:
            # Upper neck: elegant widening
            st = (t - 0.08) / 0.32
            width = max_w * (0.02 + 0.78 * (st ** 1.4))
        elif t < 0.7:
            # Belly: full width with subtle bulge
            st = (t - 0.4) / 0.3
            width = max_w * (0.80 + 0.20 * math.sin(st * math.pi))
        else:
            # Bottom: smooth round-off
            st = (t - 0.7) / 0.3
            width = max_w * math.cos(st * math.pi * 0.5)
        
        points_left.append((cx - width, y))
    
    points_right = [(cx + (cx - x), y) for x, y in reversed(points_left)]
    return points_left + points_right

drop_cx, drop_cy = CENTER, int(SIZE * 0.47)

# Outer shadow/depth layer
print("Drawing droplet layers...")
shadow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
s_draw = ImageDraw.Draw(shadow)
shadow_pts = droplet_polygon(drop_cx, drop_cy + 8, 1.04)
s_draw.polygon(shadow_pts, fill=(0, 10, 30, 50))
shadow = shadow.filter(ImageFilter.GaussianBlur(12))
shadow_alpha = ImageChops.darker(shadow.split()[3], mask)
shadow.putalpha(shadow_alpha)
img = Image.alpha_composite(img, shadow)

# Main droplet body — vertical gradient via horizontal strips
drop_body = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
drop_mask = Image.new('L', (SIZE, SIZE), 0)
dm_draw = ImageDraw.Draw(drop_mask)
main_pts = droplet_polygon(drop_cx, drop_cy, 1.0)
dm_draw.polygon(main_pts, fill=255)

# Create vertical gradient for the droplet
top_y = int(drop_cy - 270)
bot_y = int(drop_cy + 230)
for y in range(top_y, bot_y + 1):
    t = (y - top_y) / (bot_y - top_y)
    # Top: bright cyan-blue, Bottom: deep ocean blue
    r = int(40 + 160 * (1 - t) ** 1.5)
    g = int(140 + 115 * (1 - t) ** 1.2)
    b = int(230 + 25 * (1 - t))
    for x in range(SIZE):
        if drop_mask.getpixel((x, y)) > 0:
            drop_body.putpixel((x, y), (r, g, b, 245))

img = Image.alpha_composite(img, drop_body)

# === Step 4: Inner luminous highlight ===
print("Adding highlights...")
inner = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
i_draw = ImageDraw.Draw(inner)

# Upper elliptical glow
hx, hy = CENTER - 15, int(SIZE * 0.37)
for r in range(130, 0, -1):
    t = r / 130
    alpha = int(55 * (1 - t) ** 1.8)
    cr = int(160 + 95 * (1 - t))
    cg = int(215 + 40 * (1 - t))
    cb = 255
    i_draw.ellipse(
        [hx - int(r * 0.75), hy - int(r * 1.2), hx + int(r * 0.75), hy + int(r * 0.6)],
        fill=(cr, cg, cb, alpha)
    )

# Clip to droplet shape
inner_alpha = ImageChops.darker(inner.split()[3], drop_mask)
inner.putalpha(inner_alpha)
img = Image.alpha_composite(img, inner)

# === Step 5: Specular highlight (small bright dot) ===
spec = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
sp_draw = ImageDraw.Draw(spec)
sx, sy = CENTER - 50, int(SIZE * 0.30)
for r in range(28, 0, -1):
    t = r / 28
    alpha = int(220 * (1 - t) ** 2.5)
    sp_draw.ellipse(
        [sx - r, sy - int(r * 0.8), sx + r, sy + int(r * 0.8)],
        fill=(255, 255, 255, alpha)
    )
spec_alpha = ImageChops.darker(spec.split()[3], drop_mask)
spec.putalpha(spec_alpha)
img = Image.alpha_composite(img, spec)

# === Step 6: Subtle edge rim light (right side) ===
rim = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
rim_draw = ImageDraw.Draw(rim)
# Thin bright line on right edge of droplet
rim_pts_outer = droplet_polygon(drop_cx + 3, drop_cy, 1.0)
rim_pts_inner = droplet_polygon(drop_cx + 3, drop_cy, 0.96)
rim_mask_outer = Image.new('L', (SIZE, SIZE), 0)
rim_mask_inner = Image.new('L', (SIZE, SIZE), 0)
ImageDraw.Draw(rim_mask_outer).polygon(rim_pts_outer, fill=255)
ImageDraw.Draw(rim_mask_inner).polygon(rim_pts_inner, fill=255)
rim_edge = ImageChops.subtract(rim_mask_outer, rim_mask_inner)
# Only keep right half
for y in range(SIZE):
    for x in range(CENTER + 40):
        rim_edge.putpixel((x, y), 0)

rim_layer = Image.new('RGBA', (SIZE, SIZE), (180, 220, 255, 0))
rim_layer.putalpha(rim_edge)
rim_layer = rim_layer.filter(ImageFilter.GaussianBlur(3))
rim_alpha = ImageChops.darker(rim_layer.split()[3], mask)
rim_layer.putalpha(rim_alpha)
img = Image.alpha_composite(img, rim_layer)

# === Final: apply rounded rect mask ===
print("Finalizing...")
final = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
final_rgb = Image.new('RGB', (SIZE, SIZE), (0, 0, 0))
final_rgb.paste(img, mask=img.split()[3])
final.paste(final_rgb, mask=mask)

# Save all sizes
final.save('icons/app-icon-1024.png', 'PNG')
for size in [512, 256, 128, 64, 32]:
    resized = final.resize((size, size), Image.LANCZOS)
    resized.save(f'icons/app-icon-{size}.png', 'PNG')

print("All icons generated successfully.")
