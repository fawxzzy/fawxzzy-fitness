#!/usr/bin/env python3

import hashlib
import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


CATALOG_SCHEMA = "fitness-visual-catalog-manifest.v1"
BOARD_RECEIPT_SCHEMA = "fitness-visual-catalog-board-receipt.v1"
THUMBNAIL_WIDTH = 220
THUMBNAIL_HEIGHT = 390
LABEL_HEIGHT = 76
CELL_PADDING = 14
BOARD_COLUMNS = 5


def sha256_file(file_path):
    digest = hashlib.sha256()
    with file_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def slugify(value):
    normalized = re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")
    return normalized or "uncategorized"


def require_string(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Visual catalog {label} must be a non-empty string.")
    return value.strip()


def resolve_manifest_path(value, manifest_path):
    candidate = Path(require_string(value, "screenshotPath"))
    if not candidate.is_absolute():
        candidate = manifest_path.parent / candidate
    return candidate.resolve()


def read_visual_catalog(manifest_path):
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != CATALOG_SCHEMA:
        raise ValueError(
            f"Expected visual catalog schema {CATALOG_SCHEMA}, received {manifest.get('schemaVersion')!r}."
        )

    output_root = Path(require_string(manifest.get("outputRoot"), "outputRoot")).resolve()
    capture_root = output_root / "captures"
    captures = manifest.get("captures")
    if not isinstance(captures, list) or not captures:
        raise ValueError("Visual catalog captures must be a non-empty array.")

    capture_ids = set()
    screenshot_paths = set()
    normalized = []
    for index, capture in enumerate(captures):
        if not isinstance(capture, dict):
            raise ValueError(f"Visual catalog capture at index {index} must be an object.")
        capture_id = require_string(capture.get("captureId"), f"capture[{index}].captureId")
        if capture_id in capture_ids:
            raise ValueError(f"Duplicate visual catalog captureId: {capture_id}")
        capture_ids.add(capture_id)

        if capture.get("status") != "captured":
            raise ValueError(f"Visual catalog capture {capture_id} is not captured.")
        screenshot_path = resolve_manifest_path(capture.get("screenshotPath"), manifest_path)
        if screenshot_path in screenshot_paths:
            raise ValueError(f"Duplicate visual catalog screenshot path: {screenshot_path}")
        screenshot_paths.add(screenshot_path)
        if not screenshot_path.is_file():
            raise FileNotFoundError(f"Missing visual catalog screenshot: {screenshot_path}")
        if capture_root not in screenshot_path.parents:
            raise ValueError(f"Visual catalog screenshot is outside the capture root: {screenshot_path}")

        actual_hash = sha256_file(screenshot_path)
        expected_hash = capture.get("screenshotSha256")
        if expected_hash and expected_hash != actual_hash:
            raise ValueError(f"Visual catalog screenshot digest mismatch for {capture_id}.")

        normalized.append(
            {
                "captureId": capture_id,
                "stateId": require_string(capture.get("stateId"), f"capture[{index}].stateId"),
                "family": require_string(capture.get("family"), f"capture[{index}].family"),
                "registryIndex": int(capture.get("registryIndex")),
                "variantIndex": int(capture.get("variantIndex")),
                "viewport": capture.get("viewport"),
                "requestedRoute": require_string(
                    capture.get("requestedRoute"),
                    f"capture[{index}].requestedRoute",
                ),
                "resolvedRoute": require_string(
                    capture.get("resolvedRoute"),
                    f"capture[{index}].resolvedRoute",
                ),
                "screenshotPath": screenshot_path,
                "screenshotSha256": actual_hash,
            }
        )

    if capture_root.is_dir():
        discovered = {entry.resolve() for entry in capture_root.rglob("*.png")}
        orphans = sorted(str(entry) for entry in discovered - screenshot_paths)
        if orphans:
            raise ValueError(f"Orphan visual catalog screenshot(s): {', '.join(orphans)}")

    normalized.sort(key=lambda capture: (capture["registryIndex"], capture["variantIndex"], capture["captureId"]))
    return manifest, output_root, normalized


def viewport_label(viewport):
    if isinstance(viewport, dict):
        if isinstance(viewport.get("label"), str):
            return viewport["label"]
        if isinstance(viewport.get("width"), int) and isinstance(viewport.get("height"), int):
            return f"{viewport['width']}x{viewport['height']}"
    return str(viewport)


def fit_thumbnail(image):
    source = image.convert("RGB")
    source.thumbnail((THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT), (15, 23, 20))
    offset = ((THUMBNAIL_WIDTH - source.width) // 2, (THUMBNAIL_HEIGHT - source.height) // 2)
    canvas.paste(source, offset)
    return canvas


def render_board(captures, output_path):
    rows = math.ceil(len(captures) / BOARD_COLUMNS)
    cell_width = THUMBNAIL_WIDTH + (CELL_PADDING * 2)
    cell_height = THUMBNAIL_HEIGHT + LABEL_HEIGHT + (CELL_PADDING * 2)
    board = Image.new(
        "RGB",
        (BOARD_COLUMNS * cell_width, rows * cell_height),
        (7, 12, 10),
    )
    draw = ImageDraw.Draw(board)
    font = ImageFont.load_default()

    for index, capture in enumerate(captures):
        column = index % BOARD_COLUMNS
        row = index // BOARD_COLUMNS
        x = (column * cell_width) + CELL_PADDING
        y = (row * cell_height) + CELL_PADDING
        with Image.open(capture["screenshotPath"]) as source:
            board.paste(fit_thumbnail(source), (x, y))
        label_lines = [
            capture["stateId"],
            viewport_label(capture["viewport"]),
            f"request {capture['requestedRoute']}",
            f"resolved {capture['resolvedRoute']}",
        ]
        draw.multiline_text(
            (x, y + THUMBNAIL_HEIGHT + 6),
            "\n".join(label_lines),
            fill=(226, 232, 228),
            font=font,
            spacing=2,
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    board.save(output_path, format="PNG", optimize=False, compress_level=9)


def build_visual_catalog_boards(manifest_path):
    manifest, output_root, captures = read_visual_catalog(manifest_path)
    boards_root = output_root / "boards"
    boards_root.mkdir(parents=True, exist_ok=True)

    families = {}
    for capture in captures:
        families.setdefault(capture["family"], []).append(capture)

    board_records = []
    for family in sorted(families):
        board_path = boards_root / f"family-{slugify(family)}.png"
        render_board(families[family], board_path)
        board_records.append(
            {
                "family": family,
                "captureCount": len(families[family]),
                "path": str(board_path),
                "sha256": sha256_file(board_path),
            }
        )

    mega_board_path = boards_root / "mega-board.png"
    render_board(captures, mega_board_path)
    board_records.append(
        {
            "family": "All states",
            "captureCount": len(captures),
            "path": str(mega_board_path),
            "sha256": sha256_file(mega_board_path),
        }
    )

    receipt = {
        "schemaVersion": BOARD_RECEIPT_SCHEMA,
        "source": manifest.get("source"),
        "registry": manifest.get("registry"),
        "environment": manifest.get("environment"),
        "manifestPath": str(manifest_path.resolve()),
        "manifestSha256": sha256_file(manifest_path),
        "captureCount": len(captures),
        "familyCount": len(families),
        "captureOrder": [capture["captureId"] for capture in captures],
        "captures": [
            {
                "captureId": capture["captureId"],
                "stateId": capture["stateId"],
                "family": capture["family"],
                "viewport": viewport_label(capture["viewport"]),
                "requestedRoute": capture["requestedRoute"],
                "resolvedRoute": capture["resolvedRoute"],
                "screenshotSha256": capture["screenshotSha256"],
            }
            for capture in captures
        ],
        "boards": board_records,
    }
    receipt_path = boards_root / "board-receipt.json"
    receipt_path.write_text(f"{json.dumps(receipt, indent=2)}\n", encoding="utf-8")
    print(receipt_path)


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--visual-catalog":
        if len(sys.argv) != 3:
            raise SystemExit("Usage: build-mobile-regression-boards.py --visual-catalog <manifest.json>")
        build_visual_catalog_boards(Path(sys.argv[2]).resolve())
        return

    from mobile_regression.board_builder import main as legacy_main

    legacy_main()


if __name__ == "__main__":
    main()
