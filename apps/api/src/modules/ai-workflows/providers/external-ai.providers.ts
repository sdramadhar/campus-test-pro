import { env } from "../../config/environment";
import {
  aiProviderResponseSchema,
  AiProvider,
  AiProviderError,
  AiProviderRequest,
  AiProviderResponse,
} from "./ai-provider";

type JsonRecord = Record<string, unknown>;

interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  deployment?: string;
  apiVersion?: string;
  model: string;
}

const jsonInstruction =
  "Return strict JSON with shape {\"questions\":[{\"questionText\":\"\",\"questionType\":\"SINGLE_CHOICE\",\"options\":[{\"optionKey\":\"A\",\"optionText\":\"\",\"isCorrect\":false}],\"correctAnswer\":{},\"explanation\":\"\",\"suggestedDifficulty\":\"MEDIUM\",\"suggestedBloomLevel\":\"UNDERSTAND\",\"suggestedTopic\":\"\",\"tags\":[],\"marks\":1,\"negativeMarks\":0,\"warnings\":[],\"confidence\":0.8}],\"usage\":{\"inputTokens\":0,\"outputTokens\":0},\"metadata\":{}}. Use only CampusTest enum values.";

function buildPrompt(request: AiProviderRequest): string {
  if (request.userPrompt) return request.userPrompt;
  return [
    `Create ${String(request.count)} ${request.questionType} question(s).`,
    `Subject: ${request.subjectName}`,
    `Topic: ${request.topic}`,
    request.unit ? `Unit: ${request.unit}` : "",
    request.difficulty ? `Difficulty: ${request.difficulty}` : "",
    request.bloomLevel ? `Bloom level: ${request.bloomLevel}` : "",
    `Marks: ${String(request.marks)}`,
    `Negative marks: ${String(request.negativeMarks)}`,
    `Language: ${request.language}`,
    request.syllabusText ? `Syllabus:\n${request.syllabusText}` : "",
    request.sourceNotes ? `Source notes:\n${request.sourceNotes}` : "",
    jsonInstruction,
  ]
    .filter(Boolean)
    .join("\n");
}

function systemPrompt(request: AiProviderRequest): string {
  return (
    request.systemPrompt ??
    "You are CampusTest Pro's assessment question generation assistant. Generate accurate, curriculum-aligned questions that require human review before use."
  );
}

function parseProviderJson(text: string): AiProviderResponse {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1] ?? trimmed;
  try {
    return aiProviderResponseSchema.parse(JSON.parse(jsonText));
  } catch {
    throw new AiProviderError(
      "AI provider returned an invalid CampusTest JSON response.",
      "INVALID_PROVIDER_RESPONSE",
      false,
    );
  }
}

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const body = text ? (JSON.parse(text) as JsonRecord) : {};
    const error = body.error;
    if (error && typeof error === "object" && "message" in error) {
      return `HTTP ${String(response.status)} ${response.statusText}: ${String((error as JsonRecord).message)}. Provider response body: ${text}`.slice(0, 4000);
    }
    return `HTTP ${String(response.status)} ${response.statusText}. Provider response body: ${text || JSON.stringify(body)}`.slice(0, 4000);
  } catch {
    return `HTTP ${String(response.status)} ${response.statusText}. Provider response body: ${text}`.slice(0, 4000);
  }
}

async function postJson<T>(
  url: string,
  init: RequestInit,
  retryableStatus = new Set([408, 409, 425, 429, 500, 502, 503, 504]),
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  const response = await fetch(url, {
    ...init,
    method: "POST",
    headers,
  });
  if (!response.ok) {
    throw new AiProviderError(
      await readError(response),
      `PROVIDER_HTTP_${String(response.status)}`,
      retryableStatus.has(response.status),
    );
  }
  return (await response.json()) as T;
}

function textFromUnknown(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function usageFromUnknown(value: unknown) {
  const row = value && typeof value === "object" ? (value as JsonRecord) : {};
  return {
    inputTokens:
      Number(row.prompt_tokens ?? row.input_tokens ?? row.promptTokenCount) || 0,
    outputTokens:
      Number(row.completion_tokens ?? row.output_tokens ?? row.candidatesTokenCount) ||
      0,
    estimatedCost: undefined,
  };
}

function deterministicEmbedding(text: string, size = 48): number[] {
  const values = Array.from({ length: size }, () => 0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    let hash = 2166136261;
    for (const char of token) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    const target = Math.abs(hash) % size;
    values[target] = (values[target] ?? 0) + 1;
  }
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return magnitude === 0 ? values : values.map((value) => value / magnitude);
}

export class OpenAiProvider implements AiProvider {
  readonly name: string = "openai";
  readonly model: string;

  constructor(protected readonly config: ProviderConfig) {
    this.model = config.model;
  }

  async generateQuestions(request: AiProviderRequest): Promise<AiProviderResponse> {
    if (!this.config.apiKey) {
      throw new AiProviderError("OpenAI API key is not configured.", "PROVIDER_API_KEY_MISSING");
    }
    const body = {
      model: request.model ?? this.model,
      temperature: request.temperature ?? env().AI_TEMPERATURE,
      max_tokens: request.maxTokens ?? env().AI_MAX_OUTPUT_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt(request) },
        { role: "user", content: buildPrompt(request) },
      ],
    };
    const data = await postJson<JsonRecord>("https://api.openai.com/v1/chat/completions", {
      headers: { authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify(body),
    });
    const choices = data.choices as JsonRecord[] | undefined;
    const message = choices?.[0]?.message as JsonRecord | undefined;
    const parsed = parseProviderJson(textFromUnknown(message?.content));
    const usage = usageFromUnknown(data.usage);
    return { ...parsed, usage: { ...parsed.usage, ...usage } };
  }

  async embedText(texts: string[]): Promise<number[][]> {
    if (!this.config.apiKey) return texts.map((text) => deterministicEmbedding(text));
    const data = await postJson<JsonRecord>("https://api.openai.com/v1/embeddings", {
      headers: { authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({
        model: env().AI_EMBEDDING_MODEL,
        input: texts,
      }),
    });
    const rows = Array.isArray(data.data) ? (data.data as JsonRecord[]) : [];
    return texts.map((text, index) => {
      const embedding = rows[index]?.embedding;
      return Array.isArray(embedding)
        ? embedding.map(Number)
        : deterministicEmbedding(text);
    });
  }
}

export class AzureOpenAiProvider extends OpenAiProvider {
  override readonly name = "azure-openai";

  override async generateQuestions(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    if (
      !this.config.apiKey ||
      !this.config.baseUrl ||
      !this.config.deployment ||
      !this.config.apiVersion
    ) {
      throw new AiProviderError("Azure OpenAI configuration is incomplete.", "PROVIDER_CONFIG_MISSING");
    }
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/openai/deployments/${this.config.deployment}/chat/completions?api-version=${this.config.apiVersion}`;
    const data = await postJson<JsonRecord>(url, {
      headers: { "api-key": this.config.apiKey },
      body: JSON.stringify({
        temperature: request.temperature ?? env().AI_TEMPERATURE,
        max_tokens: request.maxTokens ?? env().AI_MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt(request) },
          { role: "user", content: buildPrompt(request) },
        ],
      }),
    });
    const choices = data.choices as JsonRecord[] | undefined;
    const message = choices?.[0]?.message as JsonRecord | undefined;
    const parsed = parseProviderJson(textFromUnknown(message?.content));
    const usage = usageFromUnknown(data.usage);
    return { ...parsed, usage: { ...parsed.usage, ...usage } };
  }
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  readonly model: string;

  constructor(private readonly config: ProviderConfig) {
    this.model = config.model;
  }

  async generateQuestions(request: AiProviderRequest): Promise<AiProviderResponse> {
    if (!this.config.apiKey) {
      throw new AiProviderError("Gemini API key is not configured.", "PROVIDER_API_KEY_MISSING");
    }
    const model = request.model ?? this.model;
    const data = await postJson<JsonRecord>(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`,
      {
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt(request) }] },
          generationConfig: {
            temperature: request.temperature ?? env().AI_TEMPERATURE,
            maxOutputTokens: request.maxTokens ?? env().AI_MAX_OUTPUT_TOKENS,
            responseMimeType: "application/json",
          },
          contents: [{ role: "user", parts: [{ text: buildPrompt(request) }] }],
        }),
      },
    );
    const candidates = data.candidates as JsonRecord[] | undefined;
    const content = candidates?.[0]?.content as JsonRecord | undefined;
    const parts = content?.parts as JsonRecord[] | undefined;
    const parsed = parseProviderJson(textFromUnknown(parts?.[0]?.text));
    const usage = usageFromUnknown(data.usageMetadata);
    return { ...parsed, usage: { ...parsed.usage, ...usage } };
  }
}

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  readonly model: string;

  constructor(private readonly config: ProviderConfig) {
    this.model = config.model;
  }

  async generateQuestions(request: AiProviderRequest): Promise<AiProviderResponse> {
    if (!this.config.apiKey) {
      throw new AiProviderError("Anthropic API key is not configured.", "PROVIDER_API_KEY_MISSING");
    }
    const data = await postJson<JsonRecord>("https://api.anthropic.com/v1/messages", {
      headers: {
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: request.model ?? this.model,
        max_tokens: request.maxTokens ?? env().AI_MAX_OUTPUT_TOKENS,
        temperature: request.temperature ?? env().AI_TEMPERATURE,
        system: `${systemPrompt(request)}\n${jsonInstruction}`,
        messages: [{ role: "user", content: buildPrompt(request) }],
      }),
    });
    const blocks = data.content as JsonRecord[] | undefined;
    const parsed = parseProviderJson(textFromUnknown(blocks?.[0]?.text));
    const usage = usageFromUnknown(data.usage);
    return { ...parsed, usage: { ...parsed.usage, ...usage } };
  }
}

export class OllamaProvider implements AiProvider {
  readonly name = "ollama";
  readonly model: string;

  constructor(private readonly config: ProviderConfig) {
    this.model = config.model;
  }

  async generateQuestions(request: AiProviderRequest): Promise<AiProviderResponse> {
    const baseUrl = this.config.baseUrl ?? "http://localhost:11434";
    const data = await postJson<JsonRecord>(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
      body: JSON.stringify({
        model: request.model ?? this.model,
        stream: false,
        format: "json",
        options: {
          temperature: request.temperature ?? env().AI_TEMPERATURE,
          num_predict: request.maxTokens ?? env().AI_MAX_OUTPUT_TOKENS,
        },
        messages: [
          { role: "system", content: systemPrompt(request) },
          { role: "user", content: buildPrompt(request) },
        ],
      }),
    });
    const message = data.message as JsonRecord | undefined;
    return parseProviderJson(
      textFromUnknown(message?.content) || textFromUnknown(data.response),
    );
  }

  async embedText(texts: string[]): Promise<number[][]> {
    const baseUrl = this.config.baseUrl ?? "http://localhost:11434";
    const embeddings: number[][] = [];
    for (const text of texts) {
      try {
        const data = await postJson<JsonRecord>(`${baseUrl.replace(/\/$/, "")}/api/embeddings`, {
          body: JSON.stringify({ model: env().AI_EMBEDDING_MODEL, prompt: text }),
        });
        embeddings.push(Array.isArray(data.embedding) ? data.embedding.map(Number) : deterministicEmbedding(text));
      } catch {
        embeddings.push(deterministicEmbedding(text));
      }
    }
    return embeddings;
  }
}

export function localSemanticEmbedding(texts: string[]): number[][] {
  return texts.map((text) => deterministicEmbedding(text));
}
