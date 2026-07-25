import { AuthShell } from "../../../components/auth-shell";
import { SyllabusPanel } from "../../../components/syllabus-panel";

export default function SyllabusDetailPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Academic planning"
      title="Syllabus"
    >
      <SyllabusPanel />
    </AuthShell>
  );
}
