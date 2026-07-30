"use client";

import { Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch, responseErrorMessage } from "../lib/api-client";
import { analyticsRequest, textValue } from "../lib/analytics";

interface ResultReportRow {
  studentName: string;
  rollNumber: string;
  studentId: string;
  assessment: string;
  marks: number;
  totalMarks: number;
  percentage: number;
  passFail: string;
  submittedTime: string;
  timeTaken: string;
  timeTakenSeconds: number | null;
  violations: number;
  resultStatus: string;
  published: boolean;
}

interface ResultReportResponse {
  data: ResultReportRow[];
  totals: Record<string, number>;
  charts: Record<string, Array<{ label: string; value: number }>>;
}

interface AttemptAdminRow {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber?: string | null;
  attemptNumber: number;
  status: string;
  score?: number | null;
  percentage?: number | null;
  startedAt: string;
  submittedAt?: string | null;
  durationSeconds?: number | null;
  violations: number;
}

export function ResultReportsPanel({
  assessmentId,
}: {
  assessmentId?: string;
}) {
  const [rows, setRows] = useState<ResultReportRow[]>([]);
  const [attemptRows, setAttemptRows] = useState<AttemptAdminRow[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ from: "", to: "" });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (assessmentId) params.set("assessmentId", assessmentId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    return params;
  }, [assessmentId, filters.from, filters.to]);

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const response = await analyticsRequest<ResultReportResponse>(
        `/api/v1/reports/results${query.size ? `?${query.toString()}` : ""}`,
      );
      setRows(response.data.data);
      setTotals(response.data.totals);
      if (assessmentId) {
        const attemptsResponse = await analyticsRequest<AttemptAdminRow[]>(
          `/api/v1/assessments/${assessmentId}/attempts`,
        );
        setAttemptRows(attemptsResponse.data);
      }
      setStatus("ready");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Reports could not be loaded.",
      );
      setStatus("error");
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv(): Promise<void> {
    setMessage("");
    const response = await authenticatedFetch(
      `/api/v1/reports/results/export.csv${query.size ? `?${query.toString()}` : ""}`,
    );
    if (!response.ok) {
      setMessage(await responseErrorMessage(response));
      return;
    }
    const csv = await response.text();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assessment-results-${Date.now().toString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("CSV export downloaded.");
  }

  async function attemptAction(
    studentId: string,
    action: "reset" | "grant",
  ): Promise<void> {
    if (!assessmentId) return;
    setMessage("");
    const response = await authenticatedFetch(
      `/api/v1/assessments/${assessmentId}/attempts/${studentId}/${action}`,
      {
        method: "POST",
        body: JSON.stringify({
          reason:
            action === "reset"
              ? "Admin reset from results panel"
              : "Admin granted one additional attempt",
        }),
      },
    );
    if (!response.ok) {
      setMessage(await responseErrorMessage(response));
      return;
    }
    setMessage(
      action === "reset"
        ? "Student attempts reset."
        : "One additional attempt granted.",
    );
    await load();
  }

  return (
    <section className="stack">
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label>
          <span>From</span>
          <input
            name="from"
            onChange={(event) => {
              setFilters((current) => ({
                ...current,
                from: event.target.value,
              }));
            }}
            type="date"
            value={filters.from}
          />
        </label>
        <label>
          <span>To</span>
          <input
            name="to"
            onChange={(event) => {
              setFilters((current) => ({ ...current, to: event.target.value }));
            }}
            type="date"
            value={filters.to}
          />
        </label>
        <button className="primary-action" type="submit">
          <RefreshCw aria-hidden="true" />
          Refresh
        </button>
        <button
          className="secondary-action"
          onClick={() => void exportCsv()}
          type="button"
        >
          <Download aria-hidden="true" />
          Export CSV
        </button>
      </form>

      {message && (
        <div className={status === "error" ? "status error" : "status ok"}>
          {message}
        </div>
      )}

      <section className="metric-grid">
        {Object.entries(totals).map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label.replace(/([A-Z])/g, " $1").trim()}</span>
            <strong>{textValue(value)}</strong>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Assessment Results</h2>
          <span>{rows.length.toString()} row(s)</span>
        </div>
        {status === "loading" && (
          <div className="route-state">Loading reports...</div>
        )}
        {status === "ready" && rows.length === 0 && (
          <div className="empty-state">
            No submitted results match this filter.
          </div>
        )}
        {rows.length > 0 && (
          <div className="data-table">
            <div className="data-row result-report-row data-head">
              <span>Student</span>
              <span>Roll Number</span>
              <span>Assessment</span>
              <span>Marks</span>
              <span>Percentage</span>
              <span>Pass/Fail</span>
              <span>Submitted</span>
              <span>Time</span>
              <span>Violations</span>
            </div>
            {rows.map((row) => (
              <div
                className="data-row result-report-row"
                key={`${row.studentId}-${row.assessment}-${row.submittedTime}`}
              >
                <span>{row.studentName}</span>
                <span>{row.rollNumber}</span>
                <span>{row.assessment}</span>
                <span>
                  {row.marks} / {row.totalMarks}
                </span>
                <span>{row.percentage}%</span>
                <span>{row.passFail}</span>
                <span>
                  {row.submittedTime
                    ? new Date(row.submittedTime).toLocaleString()
                    : "-"}
                </span>
                <span>{row.timeTaken}</span>
                <span>{row.violations}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {assessmentId && (
        <section className="panel">
          <div className="panel-header">
            <h2>Attempt Administration</h2>
            <span>{attemptRows.length.toString()} attempt(s)</span>
          </div>
          {attemptRows.length === 0 ? (
            <div className="empty-state">No attempts have started yet.</div>
          ) : (
            <div className="data-table">
              <div className="data-row result-report-row data-head">
                <span>Student</span>
                <span>Attempt</span>
                <span>Status</span>
                <span>Score</span>
                <span>Started</span>
                <span>Submitted</span>
                <span>Violations</span>
                <span>Actions</span>
              </div>
              {attemptRows.map((attempt) => (
                <div className="data-row result-report-row" key={attempt.id}>
                  <span>{attempt.studentName}</span>
                  <span>{attempt.attemptNumber}</span>
                  <span>{attempt.status}</span>
                  <span>
                    {attempt.score === null || attempt.score === undefined
                      ? "-"
                      : `${attempt.score.toString()} (${(attempt.percentage ?? 0).toString()}%)`}
                  </span>
                  <span>{new Date(attempt.startedAt).toLocaleString()}</span>
                  <span>
                    {attempt.submittedAt
                      ? new Date(attempt.submittedAt).toLocaleString()
                      : "-"}
                  </span>
                  <span>{attempt.violations}</span>
                  <span className="row-actions">
                    <button
                      onClick={() => void attemptAction(attempt.studentId, "reset")}
                      type="button"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => void attemptAction(attempt.studentId, "grant")}
                      type="button"
                    >
                      Grant +1
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
