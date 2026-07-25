"use client";

import { AuthShell } from "../../components/auth-shell";
import { CodingPanel } from "../../components/coding-panel";

export default function CodingReviewsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Manual review" title="Coding Reviews">
      <CodingPanel config={{ title: "Coding Reviews", endpoint: "/api/v1/coding/submissions", mode: "reviews" }} />
    </AuthShell>
  );
}
