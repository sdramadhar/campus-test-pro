import "reflect-metadata";
import assert from "node:assert/strict";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import {
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
  Role,
} from "../generated/phase5-client";
import { CreateQuestionDto } from "../src/modules/question-bank/dto/question-bank.dto";
import { QuestionBankService } from "../src/modules/question-bank/question-bank.service";

const collegeId = "college-1";
const subjectId = "python-subject";

async function main(): Promise<void> {
  const publicPayload = {
    title: "CODATHON",
    questionText: "Solve the Python challenge.",
    subjectId,
    topic: "Python",
    difficulty: "MEDIUM",
    type: "SINGLE_CHOICE",
    marks: 2,
    negativeMarks: 0.5,
    explanation: "Use Python.",
    tags: ["python"],
    status: "ACTIVE",
    options: [
      {
        optionKey: "A",
        optionText: "Correct",
        displayOrder: 1,
        isCorrect: true,
      },
      {
        optionKey: "B",
        optionText: "Wrong",
        displayOrder: 2,
        isCorrect: false,
      },
    ],
  };
  const dto = plainToInstance(CreateQuestionDto, publicPayload);
  const validationErrors = validateSync(dto, {
    whitelist: true,
    forbidUnknownValues: false,
  });
  assert.deepEqual(validationErrors, []);
  assert.equal(dto.type, QuestionType.SINGLE_CHOICE);
  assert.equal(dto.marks, 2);
  assert.equal(dto.negativeMarks, 0.5);
  assert.equal(
    dto.options?.filter((option) => option.isCorrect).length,
    1,
  );

  let createdData: Record<string, unknown> | undefined;
  const tx = {
    question: {
      create: async (args: { data: Record<string, unknown> }) => {
        createdData = args.data;
        return { id: "question-1" };
      },
      findUniqueOrThrow: async () => ({
        id: "question-1",
        title: "CODATHON",
        questionText: "Solve the Python challenge.",
        subjectId,
        questionType: QuestionType.SINGLE_CHOICE,
        difficulty: QuestionDifficulty.MEDIUM,
        defaultMarks: 2,
        defaultNegativeMarks: 0.5,
        status: QuestionStatus.ACTIVE,
      }),
    },
    auditLog: { create: async () => ({ id: "audit-1" }) },
    questionTag: {
      deleteMany: async () => ({ count: 0 }),
      create: async () => ({ id: "question-tag-1" }),
    },
    tag: {
      upsert: async () => ({ id: "tag-1", name: "python", slug: "python" }),
    },
  };
  const service = new QuestionBankService({
    subject: { findFirst: async () => ({ id: subjectId, collegeId }) },
    $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) =>
      callback(tx),
  } as never);

  const result = await service.createQuestion(
    {
      id: "admin-1",
      email: "admin@demo-college.local",
      studentId: null,
      name: "Admin",
      role: Role.COLLEGE_ADMIN,
      collegeId,
      collegeName: "Demo College",
    },
    dto,
  );

  assert.equal(result.success, true);
  assert.equal(createdData?.questionType, QuestionType.SINGLE_CHOICE);
  assert.equal(createdData?.defaultMarks, 2);
  assert.equal(createdData?.defaultNegativeMarks, 0.5);
  assert.equal(createdData?.status, QuestionStatus.ACTIVE);
  console.log("Question create API tests passed.");
}

void main();
