import { expect, test } from "bun:test";
import { loadConfig } from "../src/config";
import { HttpGlinerClient } from "../src/gliner-client";

test("GLiNER binding takes precedence and preserves the internal base path", async () => {
  const config = loadConfig({
    GLINER_URL: "https://internal.example/service/gliner",
    GLINER_SERVICE_URL: "http://localhost:8000"
  });
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return Response.json({ status: "ok" });
  }) as typeof fetch;
  try {
    await new HttpGlinerClient(config).health();
    expect(requests).toEqual(["https://internal.example/service/gliner/health"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
