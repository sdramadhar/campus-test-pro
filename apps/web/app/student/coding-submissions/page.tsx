"use client";

import { AuthShell } from "../../components/auth-shell";
import { CodingPanel } from "../../components/coding-panel";

export default function StudentCodingSubmissionsPage() {
  return (
    <AuthShell allowedRoles={["STUDENT"]} eyebrow="Submission history" title="Coding Submissions">
      <CodingPanel config={{ title: "Coding Submissions", endpoint: "/api/v1/student/coding-submissions", mode: "history" }} />
    </AuthShell>
  );
}
