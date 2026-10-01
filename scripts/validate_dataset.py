#!/usr/bin/env python3
"""Validate the small JSONL corpus used for future fine-tuning."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


REQUIRED_FIELDS = {"text", "label"}


def load_labels(config_path: Path) -> set[str]:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    labels: set[str] = set()
    for group in config.values():
        if isinstance(group, dict):
            for item in group.values():
                if isinstance(item, dict) and isinstance(item.get("label"), str):
                    labels.add(item["label"])
    return labels


def validate_dataset(dataset_path: Path, config_path: Path) -> tuple[list[str], Counter[str]]:
    errors: list[str] = []
    counts: Counter[str] = Counter()
    valid_labels = load_labels(config_path)
    seen: set[str] = set()

    for line_number, raw_line in enumerate(dataset_path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw_line.strip():
            continue
        try:
            item: Any = json.loads(raw_line)
        except json.JSONDecodeError as exc:
            errors.append(f"linha {line_number}: JSON inválido ({exc.msg})")
            continue
        if not isinstance(item, dict):
            errors.append(f"linha {line_number}: cada registro deve ser um objeto")
            continue
        missing = REQUIRED_FIELDS - item.keys()
        if missing:
            errors.append(f"linha {line_number}: campos ausentes: {', '.join(sorted(missing))}")
            continue
        text = item["text"]
        label = item["label"]
        if not isinstance(text, str) or not text.strip():
            errors.append(f"linha {line_number}: texto vazio ou inválido")
        normalized_text = text.strip().casefold() if isinstance(text, str) else ""
        if normalized_text in seen:
            errors.append(f"linha {line_number}: texto duplicado")
        seen.add(normalized_text)
        if not isinstance(label, str) or not label.strip():
            errors.append(f"linha {line_number}: label vazio ou inválido")
        elif label not in valid_labels:
            errors.append(f"linha {line_number}: label desconhecido: {label}")
        else:
            counts[label] += 1

    if len(counts) >= 2:
        largest = max(counts.values())
        smallest = min(counts.values())
        if largest > smallest * 3:
            errors.append(f"balanceamento aproximado: classe mais frequente ({largest}) excede 3x a menor ({smallest})")
    return errors, counts


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=Path("datasets/christian_ethics.jsonl"))
    parser.add_argument("--config", type=Path, default=Path("config/ethics.json"))
    args = parser.parse_args()
    errors, counts = validate_dataset(args.dataset, args.config)
    if counts:
        print("Classes:", dict(counts))
    if errors:
        print("Dataset inválido:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"Dataset válido: {sum(counts.values())} registros")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
