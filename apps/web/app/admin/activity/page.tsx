import { AdminRecordList } from "../../components/admin-record-list";
import { AuthShell } from "../../components/auth-shell";

export default function ActivityPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow="Admin panel"
      title="Activity History"
    >
      <AdminRecordList
        columns={[
          { key: "action", label: "Action" },
          { key: "summary", label: "Summary" },
          { key: "user.name", label: "User" },
          { key: "createdAt", label: "Created" },
        ]}
        emptyText="No activity history found."
        endpoint="/api/v1/admin-panel/activity-history"
        readableName="activity records"
      />
    </AuthShell>
  );
}
