from __future__ import annotations

import logging
import os
from collections.abc import Mapping
from typing import Any

from .config import EthicsConfig
from .schemas import Analysis, ClassificationResponse, Explanation, ScoredLabel

logger = logging.getLogger(__name__)


def detect_device() -> str:
    import torch

    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _clamp(value: Any, fallback: float = 0.5) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return fallback


def _entry_text(entry: Any) -> tuple[str, float]:
    if isinstance(entry, Mapping):
        return str(entry.get("text", "")), _clamp(entry.get("confidence"), 0.5)
    return str(entry), 0.5


class EthicsClassifier:
    """GLiNER-backed classifier. The model is loaded once by the FastAPI lifespan."""

    def __init__(self, ethics_config: EthicsConfig, model: Any = None, device: str | None = None):
        self.ethics_config = ethics_config
        self.model = model
        self.device = device or "unknown"
        self.model_name = os.getenv("GLINER_MODEL", "fastino/gliner2.5-multi-v1")

    @classmethod
    def from_pretrained(cls, ethics_config: EthicsConfig) -> "EthicsClassifier":
        import torch
        from gliner2 import AutoExtractor

        device = detect_device()
        logger.info("Loading GLiNER model=%s device=%s", os.getenv("GLINER_MODEL", "fastino/gliner2.5-multi-v1"), device)
        model = AutoExtractor.from_pretrained(
            os.getenv("GLINER_MODEL", "fastino/gliner2.5-multi-v1"),
            map_location=device,
        )
        if device == "cuda" and torch.cuda.is_available():
            logger.info("CUDA disponível para inferência")
        return cls(ethics_config, model=model, device=device)

    def _extract_group(self, text: str, group: str) -> list[ScoredLabel]:
        descriptions = self.ethics_config.descriptions(group)
        if not descriptions:
            return []
        result = self.model.extract_entities(
            text,
            descriptions,
            include_confidence=True,
            include_spans=True,
        )
        labels: list[ScoredLabel] = []
        for label, values in (result.get("entities", {}) if isinstance(result, Mapping) else {}).items():
            if label not in descriptions:
                continue
            entries = values if isinstance(values, list) else [values]
            evidence: list[str] = []
            confidence = 0.0
            for entry in entries:
                evidence_text, entry_confidence = _entry_text(entry)
                if evidence_text:
                    evidence.append(evidence_text)
                confidence = max(confidence, entry_confidence)
            if confidence >= 0.35:
                labels.append(ScoredLabel(name=label, confidence=confidence, evidence=evidence[:3]))
        return sorted(labels, key=lambda item: item.confidence, reverse=True)

    def _moral_classification(self, text: str) -> tuple[str, float]:
        labels = self.ethics_config.descriptions("moral_classification")
        result = self.model.classify_text(text, {"moral_classification": list(labels)}, include_confidence=True)
        value: Any = result.get("moral_classification") if isinstance(result, Mapping) else None
        if isinstance(value, Mapping):
            return str(value.get("label", self.ethics_config.labels("moral_classification")[2])), _clamp(value.get("confidence"))
        return str(value or self.ethics_config.labels("moral_classification")[2]), 0.5

    def classify(self, text: str) -> ClassificationResponse:
        if self.model is None:
            raise RuntimeError("O modelo GLiNER ainda não foi carregado")
        moral, moral_confidence = self._moral_classification(text)
        virtues = self._extract_group(text, "virtues")
        principles = self._extract_group(text, "principles")
        issues = self._extract_group(text, "ethical_issues")
        detected = virtues + principles + issues
        if issues:
            summary = f"Foram identificados possíveis problemas éticos relacionados a {', '.join(item.name for item in issues[:3])}."
        elif virtues:
            summary = f"O texto apresenta elementos associados a {', '.join(item.name for item in virtues[:3])}."
        else:
            summary = "O texto não apresentou evidências fortes nas categorias configuradas."
        reasoning = [f"A classificação configurada foi '{moral}' com confiança de {moral_confidence:.2f}."]
        reasoning.extend(f"O modelo associou '{item.name}' aos trechos: {', '.join(item.evidence)}." for item in detected if item.evidence)
        if not detected:
            reasoning.append("A análise depende das categorias e definições configuradas e não constitui uma autoridade religiosa absoluta.")
        else:
            reasoning.append("Esta é uma análise baseada nas categorias configuradas no sistema, não uma autoridade religiosa absoluta.")
        return ClassificationResponse(
            analysis=Analysis(
                moral_classification=moral,
                confidence=moral_confidence,
                virtues=virtues,
                principles=principles,
                ethical_issues=issues,
            ),
            explanation=Explanation(summary=summary, reasoning=reasoning),
            model=self.model_name,
            device=self.device,
        )
