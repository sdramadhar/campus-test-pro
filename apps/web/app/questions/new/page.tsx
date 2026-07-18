import { AuthShell } from "../../components/auth-shell";
import { QuestionForm } from "../../components/question-form";

export default function NewQuestionPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Question builder"
      title="New Question"
    >
      <QuestionForm />
    </AuthShell>
  );
}
