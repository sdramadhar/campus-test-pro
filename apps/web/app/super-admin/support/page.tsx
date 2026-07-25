import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SuperAdminSupportPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="Support"
      title="Support Operations"
      description="Platform support queue with assignment, internal notes, SLA foundation, attachment security, and tenant isolation."
      endpoint="/api/v1/support/tickets"
    />
  );
}
