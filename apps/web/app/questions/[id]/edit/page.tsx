import { AuthShell } from "../../../components/auth-shell";
import { QuestionForm } from "../../../components/question-form";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Question builder"
      title="Edit Question"
    >
      <QuestionForm questionId={id} />
    </AuthShell>
  );
}
