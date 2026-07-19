import { AdminRecordList } from "../../components/admin-record-list";
import { AuthShell } from "../../components/auth-shell";

export default function NotificationsPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]}
      eyebrow="Admin panel"
      title="Notifications"
    >
      <AdminRecordList
        columns={[
          { key: "title", label: "Title" },
          { key: "message", label: "Message" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "createdAt", label: "Created" },
        ]}
        emptyText="No notifications found."
        endpoint="/api/v1/admin-panel/notifications"
        notifications
        readableName="notifications"
      />
    </AuthShell>
  );
}
