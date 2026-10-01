import type { ApiConfig } from "./config";
import { AppError } from "./errors";
import type { ClassificationResponse, ServiceHealth } from "./types";

export interface GlinerClient {
  classify(text: string, requestId: string): Promise<ClassificationResponse>;
  health(): Promise<ServiceHealth>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class HttpGlinerClient implements GlinerClient {
  constructor(private readonly config: ApiConfig) {}

  async classify(text: string, requestId: string): Promise<ClassificationResponse> {
    const response = await this.request("/classify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId
      },
      body: JSON.stringify({ text })
    });
    if (!isRecord(response)) {
      throw new AppError("Invalid response from GLiNER service", 502, "O serviço de análise retornou uma resposta inválida.");
    }
    return response as unknown as ClassificationResponse;
  }

  async health(): Promise<ServiceHealth> {
    try {
      const response = await this.request("/health", { method: "GET" }, 1);
      return isRecord(response) ? response as ServiceHealth : { status: "unknown" };
    } catch {
      return { status: "unavailable" };
    }
  }

  private async request(path: string, init: RequestInit, attempts = this.config.retryAttempts): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(new URL(path.replace(/^\//, ""), `${this.config.glinerServiceUrl.replace(/\/$/, "")}/`), {
          ...init,
          signal: AbortSignal.timeout(this.config.requestTimeoutMs)
        });
        if (response.ok) return await response.json();
        const retryable = response.status >= 500 || response.status === 429;
        if (!retryable || attempt === attempts) {
          throw new AppError(`GLiNER service returned ${response.status}`, 502, "O serviço de análise não está disponível no momento.");
        }
        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
        if (error instanceof AppError || attempt === attempts) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
    }
    console.error("GLiNER request failed", lastError);
    throw new AppError("GLiNER request failed", 502, "Não foi possível concluir a análise agora.");
  }
}
