from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class EthicsConfig:
    groups: dict[str, dict[str, dict[str, str]]]

    def labels(self, group: str) -> list[str]:
        return [item["label"] for item in self.groups.get(group, {}).values()]

    def descriptions(self, group: str) -> dict[str, str]:
        return {
            item["label"]: item["description"]
            for item in self.groups.get(group, {}).values()
        }


def config_path() -> Path:
    configured = os.getenv("ETHICS_CONFIG_PATH")
    if configured:
        return Path(configured)
    bundled = Path(__file__).resolve().parents[1] / "config" / "ethics.json"
    if bundled.exists():
        return bundled
    return Path(__file__).resolve().parents[3] / "config" / "ethics.json"


def load_ethics_config(path: Path | None = None) -> EthicsConfig:
    target = path or config_path()
    raw: Any = json.loads(target.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("A configuração de ética deve ser um objeto JSON")
    return EthicsConfig(groups=raw)
