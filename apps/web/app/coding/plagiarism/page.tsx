"use client";

import { AuthShell } from "../../components/auth-shell";
import { CodingPanel } from "../../components/coding-panel";

export default function CodingPlagiarismPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Similarity review" title="Coding Plagiarism">
      <CodingPanel config={{ title: "Plagiarism Jobs", endpoint: "/api/v1/coding/plagiarism/jobs", mode: "plagiarism" }} />
    </AuthShell>
  );
}
