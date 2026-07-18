import { AuthShell } from "../components/auth-shell";
import { QuestionList } from "../components/question-list";

export default function QuestionsPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Question bank"
      title="Questions"
    >
      <QuestionList />
    </AuthShell>
  );
}
