import {
  BloomLevel,
  QuestionDifficulty,
  QuestionType,
} from "../../../../generated/phase5-client";
import {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
} from "./ai-provider";

export class MockAiProvider implements AiProvider {
  readonly name = "mock";

  constructor(readonly model = "campustest-mock-v1") {}

  generateQuestions(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    const questions = Array.from({ length: request.count }, (_, index) => {
      const number = index + 1;
      const stem = `[Mock AI] ${request.subjectName}: ${request.topic} practice question ${String(number)}`;
      return {
        questionText: this.questionText(stem, request.questionType),
        questionType: request.questionType,
        options: this.options(request.questionType),
        correctAnswer: this.correctAnswer(request.questionType),
        explanation:
          "Mock explanation for development review. Replace or edit before use.",
        suggestedDifficulty: request.difficulty ?? QuestionDifficulty.MEDIUM,
        suggestedBloomLevel: request.bloomLevel ?? BloomLevel.UNDERSTAND,
        suggestedTopic: request.topic,
        tags: ["mock-ai", request.topic.toLowerCase().replace(/\s+/g, "-")],
        marks: request.marks,
        negativeMarks: request.negativeMarks,
        warnings: [
          "AI-generated content must be reviewed before use.",
          "This deterministic mock output is for development/test only.",
        ],
        confidence: 0.72,
      };
    });
    return Promise.resolve({
      questions,
      usage: {
        inputTokens: Math.max(20, request.topic.length + questions.length * 8),
        outputTokens: questions.length * 80,
        estimatedCost: 0,
        actualCost: 0,
      },
      metadata: { deterministic: true, provider: this.name },
    });
  }

  private questionText(stem: string, type: QuestionType): string {
    if (type === QuestionType.TRUE_FALSE) {
      return `${stem}. State whether the concept is applied correctly.`;
    }
    if (type === QuestionType.CODING) {
      return `${stem}. Write a function that demonstrates the concept.`;
    }
    return `${stem}. Choose or write the best answer.`;
  }

  private options(type: QuestionType) {
    if (
      type !== QuestionType.SINGLE_CHOICE &&
      type !== QuestionType.MULTIPLE_CHOICE &&
      type !== QuestionType.TRUE_FALSE
    ) {
      return [];
    }
    if (type === QuestionType.TRUE_FALSE) {
      return [
        { optionKey: "A", optionText: "True", isCorrect: true },
        { optionKey: "B", optionText: "False", isCorrect: false },
      ];
    }
    return [
      {
        optionKey: "A",
        optionText: "Correct development answer",
        isCorrect: true,
      },
      {
        optionKey: "B",
        optionText: "Close but incomplete answer",
        isCorrect: false,
      },
      { optionKey: "C", optionText: "Unrelated answer", isCorrect: false },
      { optionKey: "D", optionText: "Contradictory answer", isCorrect: false },
    ];
  }

  private correctAnswer(type: QuestionType): unknown {
    if (type === QuestionType.TRUE_FALSE) return true;
    if (type === QuestionType.MULTIPLE_CHOICE) return ["A"];
    if (type === QuestionType.NUMERICAL) return { value: 42, tolerance: 0 };
    if (type === QuestionType.CODING) {
      return { publicTests: [{ input: "sample", expectedOutput: "sample" }] };
    }
    return "A";
  }
}
