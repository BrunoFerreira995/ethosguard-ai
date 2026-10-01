from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.classifier import EthicsClassifier
from app.config import load_ethics_config
from app.main import create_app

ROOT = Path(__file__).resolve().parents[3]


class FakeModel:
    def classify_text(self, text, schema, include_confidence=True):
        return {"moral_classification": {"label": "virtuoso", "confidence": 0.91}}

    def extract_entities(self, text, descriptions, include_confidence=True, include_spans=True):
        found = {}
        if "honestidade" in descriptions and "devolvi" in text.lower():
            found["honestidade"] = [{"text": "devolvi a carteira", "confidence": 0.93}]
        if "caridade" in descriptions and "ajudar" in text.lower():
            found["caridade"] = [{"text": "ajudar uma pessoa", "confidence": 0.92}]
        return {"entities": found}


def test_classify_endpoint_returns_structured_analysis():
    config = load_ethics_config(ROOT / "config/ethics.json")
    classifier = EthicsClassifier(config, model=FakeModel(), device="cpu")
    client = TestClient(create_app(classifier))
    response = client.post("/classify", json={"text": "Encontrei uma carteira e devolvi ao proprietário."})
    assert response.status_code == 200
    body = response.json()
    assert body["analysis"]["moral_classification"] == "virtuoso"
    assert body["analysis"]["virtues"][0]["name"] == "honestidade"
    assert body["explanation"]["reasoning"]


def test_empty_text_is_rejected():
    config = load_ethics_config(ROOT / "config/ethics.json")
    client = TestClient(create_app(EthicsClassifier(config, model=FakeModel(), device="cpu")))
    assert client.post("/classify", json={"text": "   "}).status_code == 422


def test_config_is_dynamic():
    config = json.loads((ROOT / "config/ethics.json").read_text(encoding="utf-8"))
    assert "honesty" in config["virtues"]
    assert config["virtues"]["honesty"]["label"] == "honestidade"
