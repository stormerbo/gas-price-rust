#!/usr/bin/env python3
"""
修复图标格式：将 RGB 转换为 RGBA
"""

from PIL import Image
import os

def convert_to_rgba(input_path, output_path=None):
    """将图片转换为 RGBA 格式"""
    if output_path is None:
        output_path = input_path
    
    # 打开图片
    img = Image.open(input_path)
    
    # 如果不是 RGBA，转换为 RGBA
    if img.mode != 'RGBA':
        print(f"转换 {input_path} 从 {img.mode} 到 RGBA")
        img = img.convert('RGBA')
    else:
        print(f"{input_path} 已经是 RGBA 格式")
    
    # 保存
    img.save(output_path, 'PNG')
    print(f"✅ 保存到 {output_path}")

def main():
    icons_dir = 'icons'
    
    # 需要转换的图标文件
    icon_files = [
        'icon.png',
        '32x32.png',
        '128x128.png',
        '128x128@2x.png',
    ]
    
    for icon_file in icon_files:
        icon_path = os.path.join(icons_dir, icon_file)
        if os.path.exists(icon_path):
            convert_to_rgba(icon_path)
        else:
            print(f"⚠️  文件不存在: {icon_path}")
    
    print("\n✅ 所有图标已转换为 RGBA 格式")

if __name__ == '__main__':
    main()
