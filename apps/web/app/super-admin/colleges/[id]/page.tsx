import { AuthShell } from "../../../components/auth-shell";
import { CollegeDetail } from "../../../components/college-detail";

export default async function CollegeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="College management"
      title="College Profile"
    >
      <CollegeDetail id={id} />
    </AuthShell>
  );
}
