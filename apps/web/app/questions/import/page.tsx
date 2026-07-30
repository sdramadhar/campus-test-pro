"use client";

import { Download, FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { AuthShell } from "../../components/auth-shell";
import {
  academicRequest,
  EntityRecord,
  ListResponse,
  readValue,
} from "../../lib/academic";
import {
  parseQuestionImportCsv,
  parseQuestionImportWorkbook,
  questionImportTemplateCsv,
  QuestionImportParseResult,
} from "../../lib/question-import";

interface ImportJobResponse {
  success: true;
  data: {
    totalRows: number;
    successCount: number;
    failureCount: number;
    errors?: Array<{ rowNumber?: number; message?: string }>;
  };
}

export default function QuestionImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [subjects, setSubjects] = useState<EntityRecord[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [existingQuestionTexts, setExistingQuestionTexts] = useState<string[]>([]);
  const [preview, setPreview] = useState<QuestionImportParseResult | null>(null);
  const [payload, setPayload] = useState('{"rows":[]}');
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "importing">("idle");

  const selectedSubject = subjects.find(
    (subject) => readValue(subject, "id") === selectedSubjectId,
  );

  const loadSubjects = useCallback(async () => {
    const response = await academicRequest<ListResponse>(
      "/api/v1/subjects?pageSize=100&status=ACTIVE",
    );
    setSubjects(response.data);
    if (!selectedSubjectId && response.data.length > 0) {
      const python = response.data.find((subject) =>
        `${readValue(subject, "subjectName")} ${readValue(subject, "subjectCode")}`
          .toLowerCase()
          .includes("python"),
      );
      const firstSubject = response.data[0];
      if (python) {
        setSelectedSubjectId(readValue(python, "id"));
      } else if (firstSubject) {
        setSelectedSubjectId(readValue(firstSubject, "id"));
      }
    }
  }, [selectedSubjectId]);

  const loadExistingQuestions = useCallback(async (subjectId: string) => {
    const texts: string[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: "100",
        subjectId,
      });
      const response = await academicRequest<ListResponse>(
        `/api/v1/questions?${query.toString()}`,
      );
      texts.push(
        ...response.data
          .map((question) => readValue(question, "questionText"))
          .filter((text) => text !== "-"),
      );
      totalPages = response.meta?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    setExistingQuestionTexts(texts);
  }, []);

  useEffect(() => {
    setState("loading");
    void loadSubjects()
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Unable to load subjects.");
      })
      .finally(() => {
        setState("idle");
      });
  }, [loadSubjects]);

  useEffect(() => {
    if (!selectedSubjectId) return;
    void loadExistingQuestions(selectedSubjectId).catch((error: unknown) => {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load existing questions for duplicate checks.",
      );
    });
  }, [loadExistingQuestions, selectedSubjectId]);

  async function submitJson(): Promise<void> {
    setState("importing");
    try {
      const response = await academicRequest<unknown>(
        "/api/v1/questions/import",
        { method: "POST", body: payload },
      );
      setMessage(JSON.stringify(response, null, 2));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setState("idle");
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!selectedSubjectId) {
      setMessage("Select a subject before uploading questions.");
      return;
    }
    try {
      const parsed = await parseQuestionImportFile(
        file,
        selectedSubjectId,
        existingQuestionTexts,
      );
      setPreview(parsed);
      setPayload(JSON.stringify(parsed.payload, null, 2));
      setMessage(
        `Preview ready: ${String(parsed.validRows)} valid, ${String(parsed.duplicateRows)} duplicate, ${String(parsed.invalidRows)} invalid.`,
      );
    } catch (error) {
      setPreview(null);
      setMessage(error instanceof Error ? error.message : "Unable to parse file.");
    }
  }

  async function importValidQuestions(): Promise<void> {
    if (!preview || preview.payload.rows.length === 0) {
      setMessage("Upload a file with at least one valid non-duplicate question.");
      return;
    }
    setState("importing");
    try {
      const response = await academicRequest<ImportJobResponse>(
        "/api/v1/questions/import",
        {
          method: "POST",
          body: JSON.stringify(preview.payload),
        },
      );
      await loadExistingQuestions(selectedSubjectId);
      window.sessionStorage.setItem(
        "campustest-question-toast",
        `Imported ${String(response.data.successCount)} question(s).`,
      );
      setMessage(importResultMessage(response.data));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Question import failed.");
    } finally {
      setState("idle");
    }
  }

  function downloadTemplate(): void {
    const url = URL.createObjectURL(
      new Blob([questionImportTemplateCsv()], { type: "text/csv" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "question-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Question import"
      title="Import Questions"
    >
      <section className="panel form-section">
        <div className="panel-header">
          <h2>Excel/CSV Import</h2>
          <span>Choose a subject, preview rows, then import valid questions.</span>
        </div>
        <div className="form-grid">
          <label className="wide-field">
            Subject
            <select
              onChange={(event) => {
                setSelectedSubjectId(event.target.value);
                setPreview(null);
              }}
              value={selectedSubjectId}
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={readValue(subject, "id")} value={readValue(subject, "id")}>
                  {readValue(subject, "subjectName")} ({readValue(subject, "subjectCode")})
                </option>
              ))}
            </select>
          </label>
        </div>
        <input
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(event) => void handleFileChange(event)}
          ref={fileInputRef}
          type="file"
        />
        <div className="form-actions">
          <button
            disabled={state !== "idle" || !selectedSubjectId}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <FileSpreadsheet size={18} />
            Upload Excel/CSV
          </button>
          <button onClick={downloadTemplate} type="button">
            <Download size={18} />
            Download Template
          </button>
          <button
            className="primary-action"
            disabled={state !== "idle" || !preview || preview.validRows === 0}
            onClick={() => void importValidQuestions()}
            type="button"
          >
            <Upload size={18} />
            {state === "importing" ? "Importing..." : "Import Valid Questions"}
          </button>
          <Link className="secondary-action" href="/questions">
            Question Bank
          </Link>
        </div>
        {selectedSubject && (
          <div className="status ok">
            Selected: {readValue(selectedSubject, "subjectName")} ({readValue(selectedSubject, "subjectCode")})
          </div>
        )}
        {preview && <ImportPreview preview={preview} />}
        {message && <pre className="preview-box">{message}</pre>}
      </section>

      <details className="panel form-section">
        <summary>Advanced JSON Import</summary>
        <textarea
          className="bulk-box"
          onChange={(event) => {
            setPayload(event.target.value);
          }}
          value={payload}
        />
        <div className="form-actions">
          <button
            disabled={state !== "idle"}
            onClick={() => void submitJson()}
            type="button"
          >
            <Upload size={18} />
            Import JSON
          </button>
        </div>
      </details>
    </AuthShell>
  );
}

function ImportPreview({ preview }: { preview: QuestionImportParseResult }) {
  return (
    <div className="preview-box">
      <div className="ai-status-grid">
        <span>Total rows: {preview.totalRows}</span>
        <span>Valid: {preview.validRows}</span>
        <span>Duplicate: {preview.duplicateRows}</span>
        <span>Invalid: {preview.invalidRows}</span>
      </div>
      {preview.errors.length > 0 && (
        <ul>
          {preview.errors.slice(0, 20).map((error) => (
            <li key={`${String(error.row)}-${error.field}-${error.message}`}>
              Row {error.row}: {error.field} - {error.message}
            </li>
          ))}
        </ul>
      )}
      <div className="data-table">
        <div className="data-row data-head">
          <span>Row</span>
          <span>Title</span>
          <span>Topic</span>
          <span>Difficulty</span>
          <span>Status</span>
        </div>
        {preview.rows.slice(0, 10).map((row) => (
          <div className="data-row" key={row.row}>
            <span>{row.row}</span>
            <span>{row.title}</span>
            <span>{row.topic}</span>
            <span>{row.difficulty}</span>
            <span>
              {row.duplicate
                ? "Duplicate"
                : row.errors.length > 0
                  ? "Invalid"
                  : "Valid"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

async function parseQuestionImportFile(
  file: File,
  subjectId: string,
  existingQuestionTexts: Iterable<string>,
): Promise<QuestionImportParseResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    return parseQuestionImportCsv(await file.text(), subjectId, existingQuestionTexts);
  }
  if (extension === "xlsx" || extension === "xls") {
    return parseQuestionImportWorkbook(
      await file.arrayBuffer(),
      subjectId,
      existingQuestionTexts,
    );
  }
  throw new Error("Upload a .xlsx, .xls, or .csv file.");
}

function importResultMessage(result: ImportJobResponse["data"]): string {
  const skipped = result.totalRows - result.successCount;
  return [
    `Imported count: ${String(result.successCount)}`,
    `Skipped count: ${String(skipped)}`,
    `Failed count: ${String(result.failureCount)}`,
    ...(result.errors ?? []).map(
      (error) => `Row ${String(error.rowNumber ?? "-")}: ${error.message ?? "Import failed."}`,
    ),
  ].join("\n");
}
