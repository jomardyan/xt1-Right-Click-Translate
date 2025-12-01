import os
try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillow is not installed. Please install it using 'pip install Pillow'")
    exit(1)

def create_icon(size):
    # Create a new image with a blue background
    # Color: Steel Blue
    img = Image.new('RGB', (size, size), color = (70, 130, 180))
    
    d = ImageDraw.Draw(img)
    # Draw a simple white letter "T"
    # Since we don't want to rely on fonts, we'll draw rectangles
    
    # Vertical bar of T
    bar_width = max(1, size // 5)
    bar_height = size - (size // 4)
    x0 = (size - bar_width) // 2
    y0 = size // 4
    x1 = x0 + bar_width
    y1 = size - (size // 8)
    d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255))
    
    # Horizontal bar of T
    top_bar_height = max(1, size // 5)
    top_bar_width = size - (size // 3)
    tx0 = (size - top_bar_width) // 2
    ty0 = size // 8
    tx1 = tx0 + top_bar_width
    ty1 = ty0 + top_bar_height
    d.rectangle([tx0, ty0, tx1, ty1], fill=(255, 255, 255))

    filename = f"icons/icon{size}.png"
    img.save(filename)
    print(f"Created {filename}")

sizes = [16, 48, 128]
if not os.path.exists('icons'):
    os.makedirs('icons')

for size in sizes:
    create_icon(size)
