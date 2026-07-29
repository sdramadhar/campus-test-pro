import assert from "node:assert/strict";
import { Role } from "../generated/phase5-client";
import { QuestionBankService } from "../src/modules/question-bank/question-bank.service";

const collegeId = "college-1";
const subjectId = "python-subject";
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
  let capturedWhere: unknown;
  const service = new QuestionBankService({
    assessment: {
      findFirst: async () => ({
        id: assessmentId,
        collegeId,
        subjectId,
        sections: [],
        assessmentQuestions: [],
      }),
    },
    question: {
      findMany: async (args: { where: unknown }) => {
        capturedWhere = args.where;
        return [
          {
            id: "question-1",
            collegeId,
            subjectId,
            status: "ACTIVE",
            title: "CODATHON",
            questionText: "Solve with Python.",
            deletedAt: null,
          },
        ];
      },
    },
  } as never);

  const result = await service.assessmentQuestionOptions(user, assessmentId);

  assert.equal(result.success, true);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0]?.title, "CODATHON");
  assert.equal(result.debug.selectedSubjectId, subjectId);
  assert.equal(result.debug.returnedQuestionCount, 1);
  assert.deepEqual(capturedWhere, {
    collegeId,
    deletedAt: null,
    status: "ACTIVE",
    subjectId,
  });

  console.log("Assessment question options API tests passed.");
}

void main();
