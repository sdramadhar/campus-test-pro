import { AuthShell } from "../../components/auth-shell";
import { CollegeList } from "../../components/college-list";

export default function CollegesPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="College management"
      title="Colleges"
    >
      <CollegeList />
    </AuthShell>
  );
}
