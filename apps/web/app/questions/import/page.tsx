"use client";

import { Download, Upload } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "../../components/auth-shell";
import { academicRequest } from "../../lib/academic";

export default function QuestionImportPage() {
  const [payload, setPayload] = useState('{"rows":[]}');
  const [message, setMessage] = useState("");

  async function submit(): Promise<void> {
    try {
      const response = await academicRequest<unknown>(
        "/api/v1/questions/import",
        {
          method: "POST",
          body: payload,
        },
      );
      setMessage(JSON.stringify(response));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  }

  async function template(): Promise<void> {
    const response = await academicRequest<unknown>(
      "/api/v1/questions/import/template",
    );
    setMessage(JSON.stringify(response, null, 2));
  }

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Question import"
      title="Import Questions"
    >
      <section className="panel form-section">
        <div className="panel-header">
          <h2>Bulk Import</h2>
          <span>CSV/XLSX-compatible row schema</span>
        </div>
        <textarea
          className="bulk-box"
          onChange={(event) => {
            setPayload(event.target.value);
          }}
          value={payload}
        />
        <div className="form-actions">
          <button onClick={() => void submit()} type="button">
            <Upload size={18} />
            Import
          </button>
          <button onClick={() => void template()} type="button">
            <Download size={18} />
            Template
          </button>
        </div>
        {message && <pre className="preview-box">{message}</pre>}
      </section>
    </AuthShell>
  );
}
