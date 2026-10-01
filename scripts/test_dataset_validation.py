from __future__ import annotations

import json
from pathlib import Path

from validate_dataset import validate_dataset


ROOT = Path(__file__).resolve().parents[1]


def test_sample_dataset_is_valid():
    errors, counts = validate_dataset(ROOT / "datasets/christian_ethics.jsonl", ROOT / "config/ethics.json")
    assert errors == []
    assert counts["honestidade"] == 1


def test_duplicate_and_unknown_labels_are_reported(tmp_path: Path):
    dataset = tmp_path / "dataset.jsonl"
    dataset.write_text(
        json.dumps({"text": "mesmo texto", "label": "caridade"}) + "\n"
        + json.dumps({"text": "mesmo texto", "label": "rotulo-invalido"}) + "\n",
        encoding="utf-8",
    )
    errors, _ = validate_dataset(dataset, ROOT / "config/ethics.json")
    assert any("duplicado" in error for error in errors)
    assert any("desconhecido" in error for error in errors)

