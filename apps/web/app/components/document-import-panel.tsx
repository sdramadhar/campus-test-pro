"use client";

import Link from "next/link";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";
import {
  aiRequest,
  ApiResponse,
  formText,
  toJsonBody,
  valueText,
} from "../lib/ai-workflows";
import { EntityRecord, ListResponse } from "../lib/academic";

export function DocumentImportPanel() {
  const [subjects, setSubjects] = useState<EntityRecord[]>([]);
  const [jobs, setJobs] = useState<EntityRecord[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [subjectResponse, jobResponse] = await Promise.all([
      aiRequest<ListResponse>("/api/v1/subjects?pageSize=100"),
      aiRequest<{ success: true; data: EntityRecord[] }>("/api/v1/question-imports/jobs?pageSize=10"),
    ]);
    setSubjects(subjectResponse.data);
    setJobs(jobResponse.data);
  }

  useEffect(() => {
    void load().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Unable to load imports.");
    });
  }, []);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fileName = formText(form, "fileName", "notes.txt");
    const content = formText(form, "content");
    const payload = {
      collegeId: formText(form, "collegeId") || undefined,
      subjectId: formText(form, "subjectId") || undefined,
      fileName,
      mimeType: formText(form, "mimeType", "text/plain"),
      sizeBytes: new Blob([content]).size,
      content,
    };
    try {
      const response = await aiRequest<ApiResponse<EntityRecord>>(
        "/api/v1/question-imports/documents",
        toJsonBody(payload),
      );
      setMessage(`Import job created: ${response.data.id}`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to import document.");
    }
  }

  return (
    <section className="panel ai-panel">
      <div className="form-alert">
        Document text is treated as untrusted content. OCR is only available when a provider is configured.
      </div>
      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <label>
          College ID
          <input name="collegeId" placeholder="Required for Super Admin" />
        </label>
        <label>
          Subject
          <select name="subjectId">
            <option value="">Optional subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {valueText(subject.subjectName)}
              </option>
            ))}
          </select>
        </label>
        <label>
          File name
          <input defaultValue="sample-questions.txt" name="fileName" />
        </label>
        <label>
          MIME type
          <select name="mimeType">
            <option value="text/plain">TXT</option>
            <option value="text/csv">CSV</option>
            <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">DOCX</option>
            <option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">XLSX</option>
            <option value="application/pdf">Text PDF</option>
          </select>
        </label>
        <label className="wide-field">
          Source content
          <textarea
            defaultValue={"Question 1: What is normalization?\nQuestion 2: Why are indexes useful?"}
            name="content"
            rows={6}
          />
        </label>
        <button className="primary-action" type="submit">Import Document</button>
      </form>
      {message && <div className="status ok">{message}</div>}
      <div className="data-table">
        <div className="data-row data-head ai-import-row">
          <span>File</span><span>Status</span><span>Candidates</span><span>Actions</span>
        </div>
        {jobs.map((job) => (
          <div className="data-row ai-import-row" key={job.id}>
            <span>{valueText(job.fileName)}</span>
            <span>{valueText(job.status)}</span>
            <span>{valueText(job.candidateCount)}</span>
            <span><Link href={`/questions/import-document/jobs/${job.id}`}>Open</Link></span>
          </div>
        ))}
      </div>
    </section>
  );
}
