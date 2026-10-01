from __future__ import annotations

import logging
import os
import re
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .classifier import EthicsClassifier
from .config import load_ethics_config
from .schemas import ClassifyRequest, ClassificationResponse

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)


def sanitize_text(text: str) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text).strip()


def create_app(classifier: EthicsClassifier | None = None) -> FastAPI:
    ethics_config = load_ethics_config()
    loaded_classifier = classifier

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        nonlocal loaded_classifier
        if loaded_classifier is None:
            loaded_classifier = EthicsClassifier.from_pretrained(ethics_config)
        logger.info("GLiNER service ready on device=%s", loaded_classifier.device)
        yield

    app = FastAPI(title="EthosGuard GLiNER Service", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:3102")],
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict[str, str | bool]:
        if loaded_classifier is None:
            return {"status": "loading", "model_loaded": False}
        return {
            "status": "ok",
            "model_loaded": True,
            "device": loaded_classifier.device,
            "model": loaded_classifier.model_name,
        }

    @app.post("/classify", response_model=ClassificationResponse)
    async def classify(payload: ClassifyRequest, request: Request) -> ClassificationResponse:
        text = sanitize_text(payload.text)
        if not text:
            raise HTTPException(status_code=422, detail="O texto não pode ser vazio")
        if loaded_classifier is None:
            raise HTTPException(status_code=503, detail="Modelo ainda está carregando")
        try:
            logger.info("Classifying request_id=%s chars=%s", request.headers.get("x-request-id", "-"), len(text))
            return loaded_classifier.classify(text)
        except Exception:
            logger.exception("Classification failed")
            raise HTTPException(status_code=500, detail="Falha interna na classificação") from None

    return app


app = create_app()

