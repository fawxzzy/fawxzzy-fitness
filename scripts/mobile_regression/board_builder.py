#!/usr/bin/env python3

from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


FAMILY_OUTPUTS = {
    "Exercise cards": "exercise-cards-board.png",
    "Session / logging": "session-logging-board.png",
    "Session summaries": "session-summaries-board.png",
    "Settings / detail": "settings-detail-board.png",
}

FAMILY_ORDER = list(FAMILY_OUTPUTS.keys())

BOARD_BACKGROUND = (8, 13, 18)
CARD_BACKGROUND = (17, 24, 31)
CARD_BORDER = (42, 58, 74)
PRIMARY_TEXT = (235, 241, 247)
SECONDARY_TEXT = (143, 160, 178)

OUTER_PADDING = 32
CARD_PADDING = 18
BOARD_GAP = 24
CARD_GAP = 12
THUMBNAIL_HEIGHT = 240
BOARD_FONT_OVERRIDE_ENV = "MOBILE_REGRESSION_BOARD_FONT"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def manifest_path_from_argv() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1]).resolve()
    return repo_root() / ".codex" / "qa" / "mobile-regression" / "manifest.json"


def load_manifest(manifest_path: Path) -> dict:
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def validate_manifest(manifest: object) -> dict:
    if not isinstance(manifest, dict):
        raise ValueError("Manifest root must be a JSON object.")

    widths = manifest.get("widths")
    if not isinstance(widths, list) or not widths or any(not isinstance(width, int) or width <= 0 for width in widths):
        raise ValueError("Manifest widths must be a non-empty list of positive integers.")

    scenarios = manifest.get("scenarios")
    if not isinstance(scenarios, list):
        raise ValueError("Manifest scenarios must be a list.")

    for index, scenario in enumerate(scenarios):
        if not isinstance(scenario, dict):
            raise ValueError(f"Manifest scenario at index {index} must be an object.")

        scenario_id = scenario.get("id")
        missing_fields = [field for field in ("id", "name", "family", "captures") if field not in scenario]
        if missing_fields:
            scenario_label = scenario_id if isinstance(scenario_id, str) and scenario_id else f"at index {index}"
            raise ValueError(
                f"Manifest scenario {scenario_label} missing required field(s): {', '.join(missing_fields)}"
            )

        if not isinstance(scenario["id"], str) or not scenario["id"]:
            raise ValueError(f"Manifest scenario at index {index} must have a non-empty string id.")

        if not isinstance(scenario["name"], str) or not scenario["name"]:
            raise ValueError(f"Manifest scenario {scenario['id']} must have a non-empty string name.")

        if not isinstance(scenario["family"], str) or not scenario["family"]:
            raise ValueError(f"Manifest scenario {scenario['id']} must have a non-empty string family.")

        captures = scenario["captures"]
        if not isinstance(captures, list) or not captures:
            raise ValueError(f"Manifest scenario {scenario['id']} must define at least one capture.")

        for capture_index, capture in enumerate(captures):
            if not isinstance(capture, dict):
                raise ValueError(f"Manifest capture {capture_index} for scenario {scenario['id']} must be an object.")

            missing_capture_fields = [field for field in ("width", "file") if field not in capture]
            if missing_capture_fields:
                raise ValueError(
                    f"Manifest capture {capture_index} for scenario {scenario['id']} missing required field(s): "
                    + ", ".join(missing_capture_fields)
                )

            if not isinstance(capture["width"], int) or capture["width"] <= 0:
                raise ValueError(
                    f"Manifest capture {capture_index} for scenario {scenario['id']} must define a positive integer width."
                )

            if not isinstance(capture["file"], str) or not capture["file"]:
                raise ValueError(
                    f"Manifest capture {capture_index} for scenario {scenario['id']} must define a non-empty file name."
                )

    return manifest


def load_font(size: int) -> ImageFont.ImageFont:
    font_override = os.environ.get(BOARD_FONT_OVERRIDE_ENV)
    if font_override:
        if font_override.lower() == "default":
            return ImageFont.load_default()
        return ImageFont.truetype(font_override, size=size)

    for candidate in ("DejaVuSans.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def text_box(font: ImageFont.ImageFont, text: str) -> tuple[int, int]:
    left, top, right, bottom = font.getbbox(text)
    return right - left, bottom - top


def fit_image(image: Image.Image, target_height: int) -> Image.Image:
    scale = target_height / image.height
    width = max(1, round(image.width * scale))
    return image.resize((width, target_height), Image.Resampling.LANCZOS)


def scenario_card(output_dir: Path, scenario: dict, fonts: dict[str, ImageFont.ImageFont]) -> Image.Image:
    title_font = fonts["title"]
    meta_font = fonts["meta"]
    width_font = fonts["width"]

    title = scenario["name"]
    scenario_id = scenario["id"]
    captures = sorted(scenario["captures"], key=lambda capture: capture["width"])

    thumbnails: list[tuple[Image.Image, str]] = []
    for capture in captures:
        image_path = output_dir / capture["file"]
        if not image_path.exists():
            raise FileNotFoundError(f"Missing screenshot for board generation: {image_path}")
        with Image.open(image_path) as image:
            thumbnails.append((fit_image(image.convert("RGB"), THUMBNAIL_HEIGHT), f"{capture['width']}px"))

    title_width, title_height = text_box(title_font, title)
    meta_width, meta_height = text_box(meta_font, scenario_id)
    width_label_height = max(text_box(width_font, label)[1] for _, label in thumbnails)

    thumbs_width = sum(image.width for image, _ in thumbnails) + CARD_GAP * (len(thumbnails) - 1)
    card_width = max(title_width, meta_width, thumbs_width) + CARD_PADDING * 2
    card_height = (
        CARD_PADDING * 2
        + title_height
        + 6
        + meta_height
        + 16
        + THUMBNAIL_HEIGHT
        + 10
        + width_label_height
    )

    card = Image.new("RGB", (card_width, card_height), CARD_BACKGROUND)
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle((0, 0, card_width - 1, card_height - 1), radius=18, outline=CARD_BORDER, width=1)

    draw.text((CARD_PADDING, CARD_PADDING), title, font=title_font, fill=PRIMARY_TEXT)
    draw.text((CARD_PADDING, CARD_PADDING + title_height + 6), scenario_id, font=meta_font, fill=SECONDARY_TEXT)

    row_top = CARD_PADDING + title_height + 6 + meta_height + 16
    row_width = sum(image.width for image, _ in thumbnails) + CARD_GAP * (len(thumbnails) - 1)
    row_left = CARD_PADDING + max(0, (card_width - CARD_PADDING * 2 - row_width) // 2)

    cursor_x = row_left
    label_top = row_top + THUMBNAIL_HEIGHT + 10
    for image, label in thumbnails:
        card.paste(image, (cursor_x, row_top))
        label_width, _ = text_box(width_font, label)
        draw.text((cursor_x + max(0, (image.width - label_width) // 2), label_top), label, font=width_font, fill=SECONDARY_TEXT)
        cursor_x += image.width + CARD_GAP

    return card


def columns_for_count(count: int, *, mega: bool) -> int:
    if count <= 1:
        return 1
    if mega:
        return 3 if count >= 6 else 2
    return 2 if count >= 2 else 1


def render_board(output_dir: Path, *, title: str, subtitle: str, scenarios: list[dict], filename: str, mega: bool) -> None:
    fonts = {
        "board_title": load_font(28),
        "board_meta": load_font(16),
        "title": load_font(18),
        "meta": load_font(14),
        "width": load_font(13),
    }

    cards = [scenario_card(output_dir, scenario, fonts) for scenario in scenarios]
    columns = columns_for_count(len(cards), mega=mega)
    rows = math.ceil(len(cards) / columns)
    cell_width = max(card.width for card in cards)
    cell_height = max(card.height for card in cards)

    board_title_width, board_title_height = text_box(fonts["board_title"], title)
    _, board_meta_height = text_box(fonts["board_meta"], subtitle)

    grid_width = columns * cell_width + (columns - 1) * BOARD_GAP
    grid_height = rows * cell_height + (rows - 1) * BOARD_GAP
    board_width = max(grid_width, board_title_width) + OUTER_PADDING * 2
    board_height = OUTER_PADDING * 2 + board_title_height + 10 + board_meta_height + 24 + grid_height

    board = Image.new("RGB", (board_width, board_height), BOARD_BACKGROUND)
    draw = ImageDraw.Draw(board)

    draw.text((OUTER_PADDING, OUTER_PADDING), title, font=fonts["board_title"], fill=PRIMARY_TEXT)
    draw.text((OUTER_PADDING, OUTER_PADDING + board_title_height + 10), subtitle, font=fonts["board_meta"], fill=SECONDARY_TEXT)

    grid_top = OUTER_PADDING + board_title_height + 10 + board_meta_height + 24
    for index, card in enumerate(cards):
        row = index // columns
        column = index % columns
        cell_left = OUTER_PADDING + column * (cell_width + BOARD_GAP)
        cell_top = grid_top + row * (cell_height + BOARD_GAP)
        card_left = cell_left + max(0, (cell_width - card.width) // 2)
        card_top = cell_top + max(0, (cell_height - card.height) // 2)
        board.paste(card, (card_left, card_top))

    board.save(output_dir / filename)


def main() -> None:
    manifest_path = manifest_path_from_argv()
    manifest = validate_manifest(load_manifest(manifest_path))
    output_dir = manifest_path.parent

    scenarios = manifest["scenarios"]
    widths = ", ".join(f"{width}px" for width in manifest["widths"])

    if not scenarios:
        raise ValueError("Manifest contains no scenarios.")

    unknown_families = sorted({scenario["family"] for scenario in scenarios if scenario["family"] not in FAMILY_OUTPUTS})
    if unknown_families:
        raise ValueError(f"Manifest contains unknown review families: {', '.join(unknown_families)}")

    extra_board = output_dir / "other-board.png"
    if extra_board.exists():
        extra_board.unlink()

    for family, filename in FAMILY_OUTPUTS.items():
        family_scenarios = [scenario for scenario in scenarios if scenario["family"] == family]
        if not family_scenarios:
            continue
        render_board(
            output_dir,
            title=family,
            subtitle=f"{len(family_scenarios)} scenario(s) • widths {widths}",
            scenarios=family_scenarios,
            filename=filename,
            mega=False,
        )

    ordered_scenarios = []
    for family in FAMILY_ORDER:
        ordered_scenarios.extend([scenario for scenario in scenarios if scenario["family"] == family])
    if len(ordered_scenarios) != len(scenarios):
        raise ValueError("Manifest scenario ordering dropped one or more scenarios.")

    render_board(
        output_dir,
        title="Mobile Regression Review",
        subtitle=f"{len(ordered_scenarios)} scenario(s) • widths {widths}",
        scenarios=ordered_scenarios,
        filename="mega-board.png",
        mega=True,
    )


if __name__ == "__main__":
    main()
