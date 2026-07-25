"use client";

import { AuthShell } from "../../components/auth-shell";
import { ProctoringPanel } from "../../components/proctoring-panel";

export default function ProctorReviewsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Human review" title="Proctoring Reviews">
      <ProctoringPanel config={{ title: "Review Queue", eyebrow: "Reviews", endpoint: "/api/v1/proctoring/reviews", mode: "reviews" }} />
    </AuthShell>
  );
}
