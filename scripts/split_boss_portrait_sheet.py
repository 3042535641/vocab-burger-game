from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


FRAME_NAMES = [
    "normal",
    "waiting",
    "worried",
    "angry",
    "reactionCloseup",
    "satisfied",
]


def is_light(pixel: tuple[int, int, int]) -> bool:
    r, g, b = pixel
    return r > 225 and g > 225 and b > 225


def separator_groups(values: list[float], threshold: float = 0.82) -> list[tuple[int, int]]:
    groups: list[tuple[int, int]] = []
    start: int | None = None
    for index, value in enumerate(values):
        if value >= threshold and start is None:
            start = index
        elif value < threshold and start is not None:
            if index - start >= 2:
                groups.append((start, index - 1))
            start = None
    if start is not None and len(values) - start >= 2:
        groups.append((start, len(values) - 1))
    return groups


def equal_grid_edges(image: Image.Image) -> tuple[list[int], list[int]]:
    w, h = image.size
    xs = [round(w * index / 3) for index in range(4)]
    ys = [round(h * index / 2) for index in range(3)]
    return xs, ys


def grid_edges(image: Image.Image) -> tuple[list[int], list[int]]:
    rgb = image.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    column_light = [
        sum(1 for y in range(h) if is_light(px[x, y])) / h for x in range(w)
    ]
    row_light = [
        sum(1 for x in range(w) if is_light(px[x, y])) / w for y in range(h)
    ]

    vertical = separator_groups(column_light)
    horizontal = separator_groups(row_light)

    if len(vertical) >= 2:
        v1, v2 = vertical[0], vertical[1]
        xs = [0, (v1[0] + v1[1]) // 2, (v2[0] + v2[1]) // 2, w]
    else:
        xs = [0, w // 3, (w * 2) // 3, w]

    if horizontal:
        h1 = horizontal[0]
        ys = [0, (h1[0] + h1[1]) // 2, h]
    else:
        ys = [0, h // 2, h]

    cell_widths = [xs[index + 1] - xs[index] for index in range(3)]
    cell_heights = [ys[index + 1] - ys[index] for index in range(2)]
    if min(cell_widths) < w * 0.24 or min(cell_heights) < h * 0.36:
        return equal_grid_edges(image)

    return xs, ys


def trim_light_border(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    left, right = 0, w - 1
    top, bottom = 0, h - 1

    while left < right and sum(is_light(px[left, y]) for y in range(h)) / h > 0.42:
        left += 1
    while right > left and sum(is_light(px[right, y]) for y in range(h)) / h > 0.42:
        right -= 1
    while top < bottom and sum(is_light(px[x, top]) for x in range(w)) / w > 0.42:
        top += 1
    while bottom > top and sum(is_light(px[x, bottom]) for x in range(w)) / w > 0.42:
        bottom -= 1

    return image.crop((left, top, right + 1, bottom + 1))


def stage_portrait(cell: Image.Image, size: tuple[int, int]) -> Image.Image:
    cell = trim_light_border(cell).convert("RGB")
    return ImageOps.fit(
        cell,
        size,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def split_sheet(source: Path, output_dir: Path, size: tuple[int, int], inset: int) -> None:
    image = Image.open(source)
    xs, ys = grid_edges(image)
    output_dir.mkdir(parents=True, exist_ok=True)

    index = 0
    for row in range(2):
        for col in range(3):
            name = FRAME_NAMES[index]
            # The supplied sheet has white separator gutters. Crop inside each
            # grid cell so those gutters never become visible in-game.
            x0 = xs[col] + inset
            x1 = xs[col + 1] - inset
            y0 = ys[row] + inset
            y1 = ys[row + 1] - inset
            cell = image.crop((x0, y0, x1, y1))
            portrait = stage_portrait(cell, size)
            out = output_dir / f"{name}.webp"
            portrait.save(out, "WEBP", quality=96, method=6)
            print(out)
            index += 1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument(
        "--out-dir",
        default=Path("public/art/pixel-vn-v3/boss-portrait"),
        type=Path,
    )
    parser.add_argument("--width", default=512, type=int)
    parser.add_argument("--height", default=960, type=int)
    parser.add_argument("--inset", default=14, type=int)
    args = parser.parse_args()

    split_sheet(args.input, args.out_dir, (args.width, args.height), args.inset)


if __name__ == "__main__":
    main()
