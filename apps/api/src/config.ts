export type ApiConfig = {
  port: number;
  glinerServiceUrl: string;
  corsOrigin: string;
  maxTextLength: number;
  requestTimeoutMs: number;
  retryAttempts: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  cacheEnabled: boolean;
  cacheMaxEntries: number;
};

export function loadConfig(env: Record<string, string | undefined> = Bun.env): ApiConfig {
  const getNumber = (name: string, fallback: number) => {
    const parsed = Number(env[name]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    port: getNumber("API_PORT", 3102),
    glinerServiceUrl: env.GLINER_SERVICE_URL ?? "http://localhost:8000",
    corsOrigin: env.CORS_ORIGIN ?? "http://localhost:3101",
    maxTextLength: getNumber("MAX_TEXT_LENGTH", 5000),
    requestTimeoutMs: getNumber("REQUEST_TIMEOUT_MS", 30000),
    retryAttempts: getNumber("RETRY_ATTEMPTS", 2),
    rateLimitWindowMs: getNumber("RATE_LIMIT_WINDOW_MS", 60000),
    rateLimitMaxRequests: getNumber("RATE_LIMIT_MAX_REQUESTS", 30),
    cacheEnabled: booleanEnvFrom(env, "CACHE_ENABLED", true),
    cacheMaxEntries: getNumber("CACHE_MAX_ENTRIES", 256)
  };
}

function booleanEnvFrom(env: Record<string, string | undefined>, name: string, fallback: boolean): boolean {
  const value = env[name];
  return value === undefined ? fallback : value.toLowerCase() === "true";
}
