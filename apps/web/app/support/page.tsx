import { ProtectedSaasPage } from "../components/saas-pages";

export default function SupportPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]}
      eyebrow="Support"
      title="Support Tickets"
      description="Create and track tenant-isolated support tickets, replies, assignments, SLA events, and attachment authorization."
      endpoint="/api/v1/support/tickets"
      actions={[{ href: "/support/new", label: "New ticket" }]}
    />
  );
}
