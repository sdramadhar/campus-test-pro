"use client";

import { use } from "react";
import { AuthShell } from "../../../../../components/auth-shell";
import { CodingPanel } from "../../../../../components/coding-panel";

export default function StudentCodingEditorPage({ params }: { params: Promise<{ attemptId: string; attemptQuestionId: string }> }) {
  const { attemptId, attemptQuestionId } = use(params);
  return (
    <AuthShell allowedRoles={["STUDENT"]} eyebrow="Coding assessment" title="Code Editor">
      <CodingPanel config={{ title: "Code Editor", endpoint: "", mode: "editor" }} params={{ attemptId, attemptQuestionId }} />
    </AuthShell>
  );
}
