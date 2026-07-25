import { ProtectedSaasPage } from "../../components/saas-pages";

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]}
      eyebrow="Support"
      title="Ticket Detail"
      description="Ticket messages are tenant-isolated; internal notes are visible to platform administrators only."
      endpoint={`/api/v1/support/tickets/${ticketId}`}
    />
  );
}
