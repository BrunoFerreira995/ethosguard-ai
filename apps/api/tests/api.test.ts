import { describe, expect, test } from "bun:test";

import { createApp } from "../src/server";
import type { ClassificationResponse } from "../src/types";

const result: ClassificationResponse = {
  analysis: {
    moral_classification: "virtuoso",
    confidence: 0.91,
    virtues: [{ name: "honestidade", confidence: 0.95, evidence: ["devolvi"] }],
    principles: [{ name: "justiça", confidence: 0.84 }],
    ethical_issues: []
  },
  explanation: {
    summary: "A ação demonstra honestidade.",
    reasoning: ["O trecho indica devolução voluntária."]
  },
  model: "fake",
  device: "cpu"
};

const config = {
  port: 3102,
  glinerServiceUrl: "http://localhost:8000",
  corsOrigin: "http://localhost:3101",
  maxTextLength: 5000,
  requestTimeoutMs: 1000,
  retryAttempts: 0,
  rateLimitWindowMs: 60000,
  rateLimitMaxRequests: 30,
  cacheEnabled: true,
  cacheMaxEntries: 10
};

const service = {
  calls: 0,
  async analyze() {
    this.calls += 1;
    return result;
  }
};

describe("Elysia API", () => {
  test("POST /api/analyze returns structured analysis", async () => {
    const response = await createApp({ config, analysisService: service }).handle(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Encontrei uma carteira e devolvi ao proprietário." })
      })
    );
    expect(response.status).toBe(200);
    expect((await response.json()).analysis.moral_classification).toBe("virtuoso");
  });

  test("rejects empty or oversized input", async () => {
    const app = createApp({ config, analysisService: service });
    const response = await app.handle(new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "   " })
    }));
    expect(response.status).toBe(422);
  });

  test("provides API health", async () => {
    const response = await createApp({ config, analysisService: service }).handle(
      new Request("http://localhost/health")
    );
    expect(response.status).toBe(200);
    expect((await response.json()).service).toBe("api");
  });
});

