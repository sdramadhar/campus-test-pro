import assert from "node:assert/strict";
import {
  AssessmentStatus,
  QuestionStatus,
  QuestionType,
  Role,
} from "../generated/phase5-client";
import { QuestionBankService } from "../src/modules/question-bank/question-bank.service";

const collegeId = "college-1";
const assessmentId = "assessment-1";

const user = {
  id: "admin-1",
  email: "admin@demo-college.local",
  studentId: null,
  name: "Admin",
  role: Role.COLLEGE_ADMIN,
  collegeId,
  collegeName: "Demo College",
};

async function main(): Promise<void> {
  let recalculatedTotalMarks = 0;
  const assessment = {
    id: assessmentId,
    collegeId,
    title: "Python Assessment",
    subjectId: "subject-1",
    passingMarks: 20,
    totalMarks: 0,
    assessmentQuestions: [
      {
        id: "assessment-question-1",
        sectionId: "section-1",
        assignedMarks: 1,
        question: {
          id: "question-1",
          title: "Python MCQ",
          status: QuestionStatus.ACTIVE,
          questionType: QuestionType.SINGLE_CHOICE,
        },
      },
    ],
    sections: [
      {
        id: "section-1",
        marksRule: { sectionMarks: 50 },
      },
    ],
    batchAssignments: [{ id: "batch-assignment-1" }],
    studentAssignments: [],
    assignments: [],
    startAt: null,
    endAt: null,
  };
  const service = new QuestionBankService({
    assessment: {
      findFirst: async () => assessment,
      findUniqueOrThrow: async () => assessment,
      update: async (args: { data: { totalMarks?: number; status?: AssessmentStatus } }) => {
        if (typeof args.data.totalMarks === "number") {
          recalculatedTotalMarks = args.data.totalMarks;
        }
        return { ...assessment, ...args.data };
      },
    },
    auditLog: { create: async () => ({ id: "audit-1" }) },
  } as never);

  const result = await service.publishAssessment(user, assessmentId);

  assert.equal(result.success, true);
  assert.equal(recalculatedTotalMarks, 50);
  assert.equal(result.data.status, AssessmentStatus.PUBLISHED);

  console.log("Assessment publish marks tests passed.");
}

void main();
