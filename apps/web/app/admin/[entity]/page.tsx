import { notFound } from "next/navigation";
import { AcademicManager } from "../../components/academic-manager";
import { AuthShell } from "../../components/auth-shell";
import { EntityKey, entityConfigs } from "../../lib/academic";

export default async function AdminEntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  if (!isEntityKey(entity)) {
    notFound();
  }

  const config = entityConfigs[entity];
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow={`Admin panel / ${config.eyebrow}`}
      title={config.title}
    >
      <AcademicManager config={config} />
    </AuthShell>
  );
}

function isEntityKey(value: string): value is EntityKey {
  return value in entityConfigs;
}
