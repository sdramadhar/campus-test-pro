import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AppEnvironment, env } from "../../config/environment";
import { AiProvider, AiProviderError } from "./ai-provider";
import {
  AnthropicProvider,
  AzureOpenAiProvider,
  GeminiProvider,
  OllamaProvider,
  OpenAiProvider,
} from "./external-ai.providers";
import { MockAiProvider } from "./mock-ai.provider";

@Injectable()
export class AiProviderFactory {
  private disabledUntil: Date | null = null;
  private failureCount = 0;

  getProvider(): AiProvider {
    const current = env();
    if (!this.isFeatureEnabled(current)) {
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
    if (current.AI_PROVIDER === "openai") {
      const apiKey = current.OPENAI_API_KEY ?? current.AI_API_KEY;
      if (!apiKey) {
        throw new ServiceUnavailableException(
          "OpenAI question generation is not configured. Set OPENAI_API_KEY in the API environment.",
        );
      }
      return new OpenAiProvider({
        apiKey,
        model: current.AI_MODEL,
      });
    }
    if (current.AI_PROVIDER === "gemini") {
      return new GeminiProvider({
        apiKey: current.GOOGLE_GEMINI_API_KEY ?? current.AI_API_KEY,
        model: current.AI_MODEL,
      });
    }
    if (current.AI_PROVIDER === "anthropic") {
      return new AnthropicProvider({
        apiKey: current.ANTHROPIC_API_KEY ?? current.AI_API_KEY,
        model: current.AI_MODEL,
      });
    }
    if (current.AI_PROVIDER === "azure-openai") {
      return new AzureOpenAiProvider({
        apiKey: current.AZURE_OPENAI_API_KEY ?? current.AI_API_KEY,
        baseUrl: current.AZURE_OPENAI_ENDPOINT,
        deployment: current.AZURE_OPENAI_DEPLOYMENT,
        apiVersion: current.AZURE_OPENAI_API_VERSION,
        model: current.AI_MODEL,
      });
    }
    return new OllamaProvider({
      baseUrl: current.OLLAMA_BASE_URL,
      model: current.AI_MODEL,
    });
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
    const current = env();
    const featureEnabled = this.isFeatureEnabled(current);
    const configurationMessage = this.configurationMessage(current);
    return {
      featureEnabled,
      provider: current.AI_PROVIDER,
      model: current.AI_MODEL,
      configured: featureEnabled && !configurationMessage,
      configurationMessage,
      supportedProviders: [
        "mock",
        "openai",
        "gemini",
        "anthropic",
        "azure-openai",
        "ollama",
      ],
      disabledUntil: this.disabledUntil?.toISOString() ?? null,
    };
  }

  isFeatureEnabled(current: AppEnvironment = env()): boolean {
    if (current.AI_FEATURE_ENABLED === "true") return true;
    return current.AI_PROVIDER === "openai" && Boolean(current.OPENAI_API_KEY);
  }

  configurationMessage(current: AppEnvironment = env()): string | null {
    if (!this.isFeatureEnabled(current)) return "AI features are disabled.";
    if (current.AI_PROVIDER === "openai" && !current.OPENAI_API_KEY && !current.AI_API_KEY) {
      return "OpenAI question generation is not configured. Set OPENAI_API_KEY in the API environment.";
    }
    if (current.AI_PROVIDER === "azure-openai") {
      if (!current.AZURE_OPENAI_API_KEY && !current.AI_API_KEY) {
        return "Azure OpenAI is not configured. Set AZURE_OPENAI_API_KEY in the API environment.";
      }
      if (!current.AZURE_OPENAI_ENDPOINT || !current.AZURE_OPENAI_DEPLOYMENT) {
        return "Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT in the API environment.";
      }
    }
    if (current.AI_PROVIDER === "gemini" && !current.GOOGLE_GEMINI_API_KEY && !current.AI_API_KEY) {
      return "Gemini is not configured. Set GOOGLE_GEMINI_API_KEY in the API environment.";
    }
    if (current.AI_PROVIDER === "anthropic" && !current.ANTHROPIC_API_KEY && !current.AI_API_KEY) {
      return "Anthropic is not configured. Set ANTHROPIC_API_KEY in the API environment.";
    }
    return null;
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
