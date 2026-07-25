import { AuthShell } from "../../../components/auth-shell";
import { DocumentImportPanel } from "../../../components/document-import-panel";

export default function ImportDocumentJobsPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Document import"
      title="Import Jobs"
    >
      <DocumentImportPanel />
    </AuthShell>
  );
}
