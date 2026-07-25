import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SystemJobsPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      description="Background job recovery status, stale worker visibility, queue counts, and code runner job summaries."
      endpoint="/api/v1/system/jobs"
      eyebrow="System"
      title="Job Recovery"
    />
  );
}
