import { AuthShell } from "../../../../components/auth-shell";
import { CollegeEdit } from "../../../../components/college-edit";

export default async function EditCollegePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="College management"
      title="Edit College"
    >
      <CollegeEdit id={id} />
    </AuthShell>
  );
}
