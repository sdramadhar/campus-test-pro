import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { env } from "../../config/environment";
import {
  AiProvider,
  AiProviderError,
  AiProviderRequest,
  AiProviderResponse,
} from "./ai-provider";
import { MockAiProvider } from "./mock-ai.provider";

class ExternalProviderPlaceholder implements AiProvider {
  constructor(
    readonly name: string,
    readonly model: string,
  ) {}

  generateQuestions(request: AiProviderRequest): Promise<AiProviderResponse> {
    void request;
    throw new AiProviderError(
      "The configured AI provider adapter is not enabled in this build.",
      "PROVIDER_NOT_CONFIGURED",
      false,
    );
  }
}

@Injectable()
export class AiProviderFactory {
  private disabledUntil: Date | null = null;
  private failureCount = 0;

  getProvider(): AiProvider {
    const current = env();
    if (current.AI_FEATURE_ENABLED !== "true") {
      throw new ServiceUnavailableException("AI features are disabled.");
    }
    if (this.disabledUntil && this.disabledUntil > new Date()) {
      throw new ServiceUnavailableException(
        "AI provider is temporarily unavailable.",
      );
    }
    if (current.NODE_ENV === "production" && current.AI_PROVIDER === "mock") {
      throw new ServiceUnavailableException(
        "Mock AI provider is not allowed in production.",
      );
    }
    if (current.AI_PROVIDER === "mock") {
      return new MockAiProvider(current.AI_MODEL);
    }
    if (!current.AI_API_KEY) {
      throw new ServiceUnavailableException(
        "AI provider is missing a server-side API key.",
      );
    }
    return new ExternalProviderPlaceholder(current.AI_PROVIDER, current.AI_MODEL);
  }

  async withTimeoutAndRetry<T>(operation: () => Promise<T>): Promise<T> {
    const current = env();
    let attempt = 0;
    let lastError: unknown;
    while (attempt <= current.AI_MAX_RETRIES) {
      try {
        return await this.withTimeout(operation(), current.AI_REQUEST_TIMEOUT_MS);
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt > current.AI_MAX_RETRIES) break;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * 2 ** attempt, 5000)),
        );
      }
    }
    this.failureCount += 1;
    if (this.failureCount >= 3) {
      this.disabledUntil = new Date(Date.now() + 60_000);
    }
    throw lastError instanceof Error
      ? lastError
      : new AiProviderError("AI provider failed.", "PROVIDER_FAILED", true);
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.disabledUntil = null;
  }

  providerStatus() {
    return {
      featureEnabled: env().AI_FEATURE_ENABLED === "true",
      provider: env().AI_PROVIDER,
      model: env().AI_MODEL,
      disabledUntil: this.disabledUntil?.toISOString() ?? null,
    };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_resolve, reject) => {
          timer = setTimeout(
            () => {
              reject(
                new AiProviderError(
                  "AI provider timed out.",
                  "PROVIDER_TIMEOUT",
                  true,
                ),
              );
            },
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
