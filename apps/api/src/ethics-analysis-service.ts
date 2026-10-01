import type { GlinerClient } from "./gliner-client";
import type { ClassificationResponse } from "./types";

export interface FutureLlmProvider {
  enhance(input: ClassificationResponse): Promise<ClassificationResponse>;
}

export interface EthicsAnalysisServiceContract {
  analyze(text: string, requestId: string): Promise<ClassificationResponse>;
}

export class EthicsAnalysisService implements EthicsAnalysisServiceContract {
  private readonly cache = new Map<string, ClassificationResponse>();

  constructor(
    private readonly gliner: GlinerClient,
    private readonly options: { cacheEnabled: boolean; cacheMaxEntries: number },
    private readonly llm?: FutureLlmProvider
  ) {}

  async analyze(text: string, requestId: string): Promise<ClassificationResponse> {
    const key = this.hash(text);
    const cached = this.options.cacheEnabled ? this.cache.get(key) : undefined;
    if (cached) return cached;
    const structured = await this.gliner.classify(text, requestId);
    const result = this.llm ? await this.llm.enhance(structured) : structured;
    if (this.options.cacheEnabled) {
      if (this.cache.size >= this.options.cacheMaxEntries) {
        const oldest = this.cache.keys().next().value;
        if (oldest) this.cache.delete(oldest);
      }
      this.cache.set(key, result);
    }
    return result;
  }

  private hash(text: string): string {
    return new Bun.CryptoHasher("sha256").update(text).digest("hex");
  }
}

