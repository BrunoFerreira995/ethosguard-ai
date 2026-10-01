import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";

import { loadConfig, type ApiConfig } from "./config";
import { EthicsAnalysisService, type EthicsAnalysisServiceContract } from "./ethics-analysis-service";
import { AppError } from "./errors";
import { HttpGlinerClient } from "./gliner-client";
import { RateLimiter } from "./rate-limit";

export type AppDependencies = {
  config?: ApiConfig;
  analysisService?: EthicsAnalysisServiceContract;
};

function sanitizeText(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

export function createApp(dependencies: AppDependencies = {}) {
  const config = dependencies.config ?? loadConfig();
  const analysisService = dependencies.analysisService ?? new EthicsAnalysisService(
    new HttpGlinerClient(config),
    { cacheEnabled: config.cacheEnabled, cacheMaxEntries: config.cacheMaxEntries }
  );
  const limiter = new RateLimiter(config.rateLimitWindowMs, config.rateLimitMaxRequests);

  return new Elysia({ name: "ethosguard-api" })
    .use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin }))
    .onBeforeHandle(({ request, set }) => {
      if (!new URL(request.url).pathname.endsWith("/api/analyze")) return;
      const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      const key = forwardedFor || request.headers.get("x-real-ip") || "anonymous";
      const result = limiter.check(key);
      if (!result.allowed) {
        set.status = 429;
        set.headers["retry-after"] = String(result.retryAfterSeconds);
        return { error: "rate_limit_exceeded", message: "Muitas solicitações. Tente novamente em instantes." };
      }
    })
    .onError(({ code, error, set }) => {
      if (error instanceof AppError) {
        set.status = error.statusCode;
        return { error: "analysis_error", message: error.publicMessage };
      }
      if (code === "VALIDATION") {
        set.status = 422;
        return { error: "validation_error", message: "Envie um texto válido dentro do limite configurado." };
      }
      console.error("Unhandled API error", error);
      set.status = 500;
      return { error: "internal_error", message: "Não foi possível processar a solicitação." };
    })
    .get("/health", async () => ({ status: "ok", service: "api" }))
    .get("/api/health", async () => {
      const gliner = await new HttpGlinerClient(config).health();
      return {
        status: gliner.status === "ok" ? "ok" : "degraded",
        service: "api",
        gliner
      };
    })
    .post(
      "/api/analyze",
      async ({ body, request, set }) => {
        const text = sanitizeText(body.text);
        if (!text || text.length > config.maxTextLength) {
          throw new AppError("Invalid text", 422, "O texto deve ter conteúdo e respeitar o limite configurado.");
        }
        const requestId = crypto.randomUUID();
        set.headers["x-request-id"] = requestId;
        console.info("analyze request", { requestId, characters: text.length });
        return analysisService.analyze(text, requestId);
      },
      {
        body: t.Object({
          text: t.String({ minLength: 1, maxLength: config.maxTextLength })
        })
      }
    );
}

if (import.meta.main) {
  const config = loadConfig();
  const app = createApp({ config });
  app.listen({ port: config.port, hostname: "0.0.0.0" });
  console.info(`EthosGuard API listening on http://localhost:${config.port}`);
}
