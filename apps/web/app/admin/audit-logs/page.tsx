import { AdminRecordList } from "../../components/admin-record-list";
import { AuthShell } from "../../components/auth-shell";

export default function AuditLogsPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow="Admin panel"
      title="Audit Logs"
    >
      <AdminRecordList
        columns={[
          { key: "event", label: "Event" },
          { key: "user.name", label: "User" },
          { key: "actorRole", label: "Role" },
          { key: "collegeId", label: "College" },
          { key: "createdAt", label: "Created" },
        ]}
        emptyText="No audit logs found."
        endpoint="/api/v1/admin-panel/audit-logs"
        readableName="audit logs"
      />
    </AuthShell>
  );
}
