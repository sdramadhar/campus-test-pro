import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SuperAdminAnnouncementsPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="Platform"
      title="Announcements"
      description="Manage scheduled, expiring, tenant-targeted, role-targeted, public-status-approved, and maintenance announcements."
      endpoint="/api/v1/announcements"
    />
  );
}
