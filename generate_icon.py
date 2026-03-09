#!/usr/bin/env python3
"""Generate a simple app icon for the gas price application."""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size=1024):
    """Create a simple gas pump icon."""
    # Create image with gradient-like background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background (Apple blue gradient)
    margin = size // 10
    for i in range(margin):
        alpha = int(255 * (1 - i / margin))
        color = (0, 113, 227, alpha)
        draw.rounded_rectangle(
            [i, i, size - i, size - i],
            radius=size // 6,
            fill=(0, 113 - i // 4, 227 - i // 4, 255)
        )
    
    # Draw main rounded rectangle
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size // 6,
        fill=(0, 113, 227, 255)
    )
    
    # Draw gas pump shape
    pump_width = size // 3
    pump_height = size // 2
    pump_x = (size - pump_width) // 2
    pump_y = size // 4
    
    # Pump body
    draw.rounded_rectangle(
        [pump_x, pump_y, pump_x + pump_width, pump_y + pump_height],
        radius=size // 40,
        fill=(255, 255, 255, 255)
    )
    
    # Display screen
    screen_margin = pump_width // 6
    screen_height = pump_height // 3
    draw.rounded_rectangle(
        [pump_x + screen_margin, pump_y + screen_margin,
         pump_x + pump_width - screen_margin, pump_y + screen_margin + screen_height],
        radius=size // 80,
        fill=(26, 26, 26, 255)
    )
    
    # Price text (simplified - just draw rectangles to represent text)
    text_y = pump_y + screen_margin + screen_height // 3
    text_width = pump_width - 2 * screen_margin - 40
    draw.rectangle(
        [pump_x + screen_margin + 20, text_y,
         pump_x + screen_margin + 20 + text_width, text_y + 30],
        fill=(0, 255, 0, 255)
    )
    
    # Nozzle holder
    holder_x = pump_x + pump_width
    holder_y = pump_y + pump_height // 3
    holder_width = pump_width // 4
    holder_height = pump_height // 3
    draw.rounded_rectangle(
        [holder_x, holder_y, holder_x + holder_width, holder_y + holder_height],
        radius=size // 80,
        fill=(102, 102, 102, 255)
    )
    
    # Hose (simple line)
    hose_start_x = holder_x + holder_width // 2
    hose_start_y = holder_y + holder_height // 2
    hose_end_x = holder_x + holder_width + 40
    hose_end_y = holder_y + holder_height + 60
    draw.line(
        [(hose_start_x, hose_start_y), (hose_end_x, hose_start_y + 20),
         (hose_end_x, hose_end_y)],
        fill=(51, 51, 51, 255),
        width=size // 50
    )
    
    # Nozzle
    draw.ellipse(
        [hose_end_x - 20, hose_end_y - 10, hose_end_x + 20, hose_end_y + 30],
        fill=(255, 59, 48, 255)
    )
    
    # Buttons (three circles)
    button_y = pump_y + pump_height - pump_height // 4
    button_radius = size // 40
    button_spacing = pump_width // 4
    button_start_x = pump_x + button_spacing
    
    colors = [(52, 199, 89, 255), (255, 149, 0, 255), (255, 59, 48, 255)]
    for i, color in enumerate(colors):
        button_x = button_start_x + i * button_spacing
        draw.ellipse(
            [button_x - button_radius, button_y - button_radius,
             button_x + button_radius, button_y + button_radius],
            fill=color
        )
    
    # Base
    base_height = size // 20
    draw.rounded_rectangle(
        [pump_x - 20, pump_y + pump_height,
         pump_x + pump_width + 20, pump_y + pump_height + base_height],
        radius=size // 80,
        fill=(85, 85, 85, 255)
    )
    
    # Small chart bars in corner
    chart_x = size - size // 4
    chart_y = size - size // 4
    bar_width = size // 25
    bar_spacing = size // 40
    
    bar_heights = [size // 8, size // 6, size // 10]
    bar_colors = [(52, 199, 89, 230), (255, 149, 0, 230), (255, 59, 48, 230)]
    
    for i, (height, color) in enumerate(zip(bar_heights, bar_colors)):
        bar_x = chart_x + i * (bar_width + bar_spacing)
        draw.rounded_rectangle(
            [bar_x, chart_y - height, bar_x + bar_width, chart_y],
            radius=size // 120,
            fill=color
        )
    
    return img

def main():
    """Generate all required icon sizes."""
    print("Generating app icon...")
    
    # Create icons directory if it doesn't exist
    os.makedirs('icons', exist_ok=True)
    
    # Generate base 1024x1024 icon
    icon_1024 = create_icon(1024)
    icon_1024.save('icons/icon.png', 'PNG')
    print("✓ Created icons/icon.png (1024x1024)")
    
    # Generate other required sizes
    sizes = [
        (32, 'icons/32x32.png'),
        (128, 'icons/128x128.png'),
        (256, 'icons/128x128@2x.png'),
        (512, 'icons/icon@2x.png'),
    ]
    
    for size, filename in sizes:
        resized = icon_1024.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(filename, 'PNG')
        print(f"✓ Created {filename} ({size}x{size})")
    
    print("\n✓ Icon generation complete!")
    print("\nNext steps:")
    print("1. Run: cargo tauri icon icons/icon.png")
    print("   This will generate .icns and .ico files")
    print("2. Or manually create .icns and .ico files using online tools")

if __name__ == '__main__':
    main()
