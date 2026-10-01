#!/usr/bin/env python3
"""Normalize a JSON or CSV source into the JSONL format used by GLiNER2."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any


def read_records(path: Path) -> list[dict[str, Any]]:
    if path.suffix.lower() == ".csv":
        with path.open(newline="", encoding="utf-8") as file:
            return list(csv.DictReader(file))
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else data.get("records", [])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="JSON/CSV com colunas text e label")
    parser.add_argument("output", type=Path, help="arquivo JSONL de destino")
    args = parser.parse_args()
    records = read_records(args.input)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as file:
        for record in records:
            text = str(record.get("text", "")).strip()
            label = str(record.get("label", "")).strip()
            if text and label:
                file.write(json.dumps({"text": text, "label": label}, ensure_ascii=False) + "\n")
    print(f"Preparados {len(records)} registros em {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

