"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthShell } from "../components/auth-shell";
import { OperationsStats, examOpsRequest } from "../lib/exam-operations";

export default function ExamOperationsPage() {
  const [stats, setStats] = useState<OperationsStats | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  async function load(): Promise<void> {
    setStatus("loading");
    try {
      setStats(
        await examOpsRequest<OperationsStats>(
          "/api/v1/exam-operations/dashboard",
        ),
      );
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 30000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Exam operations"
      title="Operations Dashboard"
    >
      <section className="panel">
        <div className="panel-header">
          <h2>Live Operations Snapshot</h2>
          <button onClick={() => void load()} type="button">
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
        </div>
        {status === "loading" && (
          <div className="skeleton-panel">Loading operations metrics...</div>
        )}
        {status === "error" && (
          <div className="error-panel">Could not load operations metrics.</div>
        )}
        {stats && (
          <section className="metrics">
            {Object.entries(stats).map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>
        )}
      </section>
    </AuthShell>
  );
}
