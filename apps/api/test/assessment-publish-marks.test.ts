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
const subjectId = "python-subject";

const user = {
  id: "admin-1",
  email: "admin@demo-college.local",
  studentId: null,
  name: "Admin",
  role: Role.COLLEGE_ADMIN,
  collegeId,
  collegeName: "Demo College",
};

interface SectionRow {
  id: string;
  assessmentId: string;
  marksRule: { sectionMarks: number };
  name: string;
  displayOrder: number;
}

interface AssessmentQuestionRow {
  id: string;
  assessmentId: string;
  sectionId: string | null;
  questionId: string;
  assignedMarks: number;
  assignedNegativeMarks: number;
  displayOrder: number;
  mandatory: boolean;
  question?: {
    id: string;
    title: string;
    status: QuestionStatus;
    questionType: QuestionType;
  };
}

async function main(): Promise<void> {
  let recalculatedTotalMarks = 0;
  const sections: SectionRow[] = [];
  const assessmentQuestions: AssessmentQuestionRow[] = [];
  const assessment = {
    id: assessmentId,
    collegeId,
    title: "Python Unit Test 1",
    subjectId,
    passingMarks: 20,
    totalMarks: 0,
    sections,
    assessmentQuestions,
    batchAssignments: [{ id: "batch-assignment-1" }],
    studentAssignments: [],
    assignments: [],
    startAt: null,
    endAt: null,
  };
  const question = {
    id: "question-1",
    collegeId,
    subjectId,
    title: "Python MCQ",
    status: QuestionStatus.ACTIVE,
    questionType: QuestionType.SINGLE_CHOICE,
    defaultMarks: 1,
  };
  const service = new QuestionBankService({
    assessment: {
      findFirst: async () => assessment,
      findUniqueOrThrow: async () => assessment,
      update: async (args: { data: { totalMarks?: number; status?: AssessmentStatus } }) => {
        if (typeof args.data.totalMarks === "number") {
          recalculatedTotalMarks = args.data.totalMarks;
          assessment.totalMarks = args.data.totalMarks;
        }
        return { ...assessment, ...args.data };
      },
    },
    assessmentSection: {
      create: async (args: { data: Omit<SectionRow, "id"> }) => {
        const section = { id: "section-1", ...args.data };
        sections.push(section);
        return section;
      },
      update: async (args: { data: Partial<SectionRow> }) => {
        const section = sections[0];
        assert(section);
        Object.assign(section, args.data);
        return section;
      },
    },
    assessmentQuestion: {
      create: async (args: { data: Omit<AssessmentQuestionRow, "id" | "question"> }) => {
        const row = {
          id: "assessment-question-1",
          ...args.data,
          question,
        };
        assessmentQuestions.push(row);
        return row;
      },
      updateMany: async () => ({ count: 0 }),
    },
    question: {
      findFirst: async () => question,
    },
    auditLog: { create: async () => ({ id: "audit-1" }) },
  } as never);

  const createdSection = await service.addSection(user, assessmentId, {
    name: "Section A",
    marks: 0,
    displayOrder: 1,
  });
  await service.updateSection(user, assessmentId, createdSection.data.id, {
    name: "Section A",
    marks: 50,
    displayOrder: 1,
  });
  assert.equal(sections[0]?.marksRule.sectionMarks, 50);

  await service.addAssessmentQuestion(user, assessmentId, {
    questionId: question.id,
    sectionId: createdSection.data.id,
    displayOrder: 1,
    assignedMarks: question.defaultMarks,
    assignedNegativeMarks: 0,
    mandatory: true,
  });
  assert.equal(assessmentQuestions.length, 1);
  assert.equal(assessmentQuestions[0]?.sectionId, createdSection.data.id);

  const result = await service.publishAssessment(user, assessmentId);

  assert.equal(result.success, true);
  assert.equal(recalculatedTotalMarks, 50);
  assert.equal(result.data.status, AssessmentStatus.PUBLISHED);

  console.log("Assessment publish marks tests passed.");
}

void main();
