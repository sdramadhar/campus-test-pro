"use client";

import { AuthShell } from "../../components/auth-shell";
import { CodingPanel } from "../../components/coding-panel";

export default function CodeRunnerSystemPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN"]} eyebrow="Runner operations" title="Code Runner">
      <CodingPanel config={{ title: "Code Runner", endpoint: "/api/v1/code-runner/health", mode: "runner" }} />
    </AuthShell>
  );
}
