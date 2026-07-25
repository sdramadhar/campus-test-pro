"use client";

import { AuthShell } from "../../../components/auth-shell";
import { CodingPanel } from "../../../components/coding-panel";

export default function CodeRunnerImagesPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]} eyebrow="Image allowlist" title="Runner Images">
      <CodingPanel config={{ title: "Images", endpoint: "/api/v1/code-runner/images", mode: "images" }} />
    </AuthShell>
  );
}
