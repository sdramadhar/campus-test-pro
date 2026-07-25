import { z } from "zod";
import {
  BloomLevel,
  QuestionDifficulty,
  QuestionType,
} from "../../../../generated/phase5-client";

export const generatedQuestionSchema = z.object({
  questionText: z.string().min(1),
  questionType: z.enum(QuestionType),
  options: z.array(
    z.object({
      optionKey: z.string().min(1),
      optionText: z.string().min(1),
      isCorrect: z.boolean().default(false),
    }),
  ),
  correctAnswer: z.unknown(),
  explanation: z.string().optional(),
  suggestedDifficulty: z.enum(QuestionDifficulty).optional(),
  suggestedBloomLevel: z.enum(BloomLevel).optional(),
  suggestedTopic: z.string().optional(),
  tags: z.array(z.string()).default([]),
  marks: z.number().min(0).default(1),
  negativeMarks: z.number().min(0).default(0),
  warnings: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
});

export const aiProviderResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
  usage: z
    .object({
      inputTokens: z.number().int().min(0).default(0),
      outputTokens: z.number().int().min(0).default(0),
      estimatedCost: z.number().min(0).optional(),
      actualCost: z.number().min(0).optional(),
    })
    .default({ inputTokens: 0, outputTokens: 0 }),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type AiProviderResponse = z.infer<typeof aiProviderResponseSchema>;

export interface AiProviderRequest {
  subjectName: string;
  topic: string;
  unit?: string;
  questionType: QuestionType;
  difficulty?: QuestionDifficulty;
  bloomLevel?: BloomLevel;
  count: number;
  marks: number;
  negativeMarks: number;
  language: string;
  syllabusText?: string;
  sourceNotes?: string;
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateQuestions(request: AiProviderRequest): Promise<AiProviderResponse>;
  embedText?(texts: string[]): Promise<number[][]>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}
