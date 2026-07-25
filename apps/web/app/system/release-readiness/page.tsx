import { ProtectedSaasPage } from "../../components/saas-pages";

export default function ReleaseReadinessPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      description="Production readiness checks for provider configuration, data safety, observability, workers, backups, and release blockers."
      endpoint="/api/v1/system/release-readiness"
      eyebrow="System"
      title="Release Readiness"
    />
  );
}
