"""Generate reproducible desktop and mobile icons from the approved source art."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "app-icon-source.png"
RESAMPLING = Image.Resampling.LANCZOS


def square_icon(size: int) -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    return source.resize((size, size), RESAMPLING)


def save_png(path: Path, size: int, *, opaque: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    icon = square_icon(size)
    if opaque:
        icon = icon.convert("RGB")
    icon.save(path, "PNG", optimize=True)


def save_splash(path: Path) -> None:
    current = Image.open(path)
    width, height = current.size
    canvas = Image.new("RGB", (width, height), "#E8D5A9")
    icon_size = int(min(width, height) * 0.38)
    icon = square_icon(icon_size).convert("RGB")
    canvas.paste(icon, ((width - icon_size) // 2, (height - icon_size) // 2))
    canvas.save(path, "PNG", optimize=True)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing icon source: {SOURCE}")

    icon = square_icon(1024)
    icon.save(
        ROOT / "assets" / "app-icon.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    android_sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    adaptive_foreground_sizes = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    android_root = ROOT / "android" / "app" / "src" / "main" / "res"
    for density, size in android_sizes.items():
        for filename in ("ic_launcher.png", "ic_launcher_round.png"):
            save_png(android_root / f"mipmap-{density}" / filename, size)
        save_png(
            android_root / f"mipmap-{density}" / "ic_launcher_foreground.png",
            adaptive_foreground_sizes[density],
        )

    save_png(
        ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon-512@2x.png",
        1024,
        opaque=True,
    )

    for splash in android_root.glob("drawable*/splash.png"):
        save_splash(splash)
    ios_splash = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "Splash.imageset"
    for splash in ios_splash.glob("*.png"):
        save_splash(splash)

    print("Generated Windows, Android and iOS app artwork.")


if __name__ == "__main__":
    main()
