from __future__ import annotations

from pydantic import BaseModel, Field


class ClassifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class ScoredLabel(BaseModel):
    name: str
    confidence: float = Field(ge=0, le=1)
    evidence: list[str] = Field(default_factory=list)


class Analysis(BaseModel):
    moral_classification: str
    confidence: float = Field(ge=0, le=1)
    virtues: list[ScoredLabel]
    principles: list[ScoredLabel]
    ethical_issues: list[ScoredLabel]


class Explanation(BaseModel):
    summary: str
    reasoning: list[str]


class ClassificationResponse(BaseModel):
    analysis: Analysis
    explanation: Explanation
    model: str
    device: str

