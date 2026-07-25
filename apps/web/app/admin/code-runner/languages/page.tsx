"use client";

import { AuthShell } from "../../../components/auth-shell";
import { CodingPanel } from "../../../components/coding-panel";

export default function CodeRunnerLanguagesPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]} eyebrow="Language registry" title="Runner Languages">
      <CodingPanel config={{ title: "Languages", endpoint: "/api/v1/code-runner/languages", mode: "languages" }} />
    </AuthShell>
  );
}
