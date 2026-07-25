import { ProtectedSaasPage } from "../components/saas-pages";

export default function AnnouncementsPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]}
      eyebrow="Platform"
      title="Announcements"
      description="Tenant and role-targeted announcements, maintenance messages, and dismissible status banners."
      endpoint="/api/v1/announcements"
    />
  );
}
