# tools/make_assets.py — 텅드럼 원본(assets/tonguedrum.png)에서 배포용 이미지를 만든다.
# 사용: python3 tools/make_assets.py      (필요: pip install pillow)
from pathlib import Path
from PIL import Image

SRC = Path("assets/tonguedrum.png")          # 3609×3505 원본(투명 배경)
OUT = Path("assets"); ICONS = OUT / "icons"
ICONS.mkdir(parents=True, exist_ok=True)
im = Image.open(SRC).convert("RGBA")

# 1) 게임용 WebP (비율 유지)
for w in (1024, 2048):
    h = round(im.height * w / im.width)
    im.resize((w, h), Image.LANCZOS).save(OUT / f"tonguedrum-{w}.webp", "WEBP", quality=85, method=6)

# 2) 아이콘: 정사각형 캔버스 가운데에 드럼을 놓는다. pad = 여백 비율, bg = None(투명) 또는 색
def square(size, pad=0.04, bg=None):
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    box = int(size * (1 - 2 * pad))
    scale = min(box / im.width, box / im.height)
    d = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(d, ((size - d.width) // 2, (size - d.height) // 2))
    return canvas

square(32, pad=0.0).save(ICONS / "favicon-32.png", optimize=True)
square(192).save(ICONS / "icon-192.png", optimize=True)
square(512).save(ICONS / "icon-512.png", optimize=True)
square(512, pad=0.14, bg=(255, 255, 255, 255)).save(ICONS / "icon-maskable-512.png", optimize=True)   # 안드로이드 원형 마스크 안전 영역
square(180, pad=0.08, bg=(255, 255, 255, 255)).convert("RGB").save(ICONS / "apple-touch-icon.png", optimize=True)

# 3) 공유 미리보기(카카오톡·문자) 1200×630: 연보라 배경 + 드럼
og = Image.new("RGBA", (1200, 630), (246, 240, 252, 255))
scale = 560 / im.height
d = im.resize((round(im.width * scale), 560), Image.LANCZOS)
og.alpha_composite(d, ((1200 - d.width) // 2, 35))
og.convert("RGB").save(OUT / "og-image.jpg", "JPEG", quality=85)

for p in sorted(list(OUT.glob("*.webp")) + list(OUT.glob("og-image.jpg")) + list(ICONS.glob("*.png"))):
    print(f"{p}  {Image.open(p).size}  {p.stat().st_size // 1024}KB")
