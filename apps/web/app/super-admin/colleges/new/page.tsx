import { AuthShell } from "../../../components/auth-shell";
import { CollegeForm } from "../../../components/college-form";

export default function NewCollegePage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="College management"
      title="Add College"
    >
      <CollegeForm mode="create" />
    </AuthShell>
  );
}
