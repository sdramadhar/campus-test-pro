"use client";

import { AlertCircle, BarChart3, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  adminRequest,
  DashboardResponse,
  toText,
} from "../lib/admin-panel";

const metricLabels: Record<string, string> = {
  students: "Total Students",
  faculty: "Total Faculty",
  colleges: "Total Colleges",
  departments: "Total Departments",
  subjects: "Total Subjects",
  exams: "Total Exams",
  questions: "Total Questions",
  results: "Total Results",
  batches: "Total Batches",
  semesters: "Total Semesters",
  unreadNotifications: "Unread Notifications",
};

export function AdminDashboardPanel() {
  const [data, setData] = useState<DashboardResponse["data"] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const response = await adminRequest<DashboardResponse>(
        "/api/v1/admin-panel/dashboard",
      );
      setData(response.data);
      setState("ready");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Dashboard failed to load.",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") {
    return (
      <section className="panel skeleton-panel">
        <Loader2 className="spin" aria-hidden="true" />
        Loading admin statistics...
      </section>
    );
  }

  if (state === "error" || !data) {
    return (
      <section className="panel error-panel">
        <AlertCircle aria-hidden="true" />
        {message}
      </section>
    );
  }

  return (
    <>
      <section className="toolbar admin-toolbar">
        <div className="inline-chip">
          <BarChart3 aria-hidden="true" size={18} />
          Live tenant statistics
        </div>
        <button
          className="primary-action"
          onClick={() => {
            void load();
          }}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={18} />
          Refresh
        </button>
      </section>

      <section className="metrics admin-metrics">
        {Object.entries(metricLabels).map(([key, label]) => (
          <article key={key}>
            <span>{label}</span>
            <strong>{data.totals[key] ?? 0}</strong>
          </article>
        ))}
      </section>

      <section className="admin-grid">
        {Object.entries(data.charts).map(([key, values]) => (
          <article className="panel" key={key}>
            <div className="panel-header">
              <div>
                <span>Statistics</span>
                <h2>{titleCase(key)}</h2>
              </div>
            </div>
            <div className="chart-list">
              {values.length === 0 ? (
                <p className="body-copy">No records yet.</p>
              ) : (
                values.map((item) => (
                  <div className="chart-row" key={item.label}>
                    <span>{item.label}</span>
                    <div>
                      <i
                        style={{
                          width: `${String(Math.max(8, item.value * 12))}px`,
                        }}
                      />
                    </div>
                    <strong>{item.value}</strong>
                  </div>
                ))
              )}
            </div>
          </article>
        ))}

        <article className="panel">
          <div className="panel-header">
            <div>
              <span>Activity History</span>
              <h2>Recent Activity</h2>
            </div>
          </div>
          <div className="activity-list">
            {data.recentActivity.length === 0 ? (
              <p className="body-copy">No activity has been recorded yet.</p>
            ) : (
              data.recentActivity.map((item) => (
                <div key={item.id}>
                  <strong>
                    {toText(item.summary, toText(item.action, "Activity"))}
                  </strong>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </>
  );
}

function titleCase(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: unknown): string {
  return typeof value === "string" ? new Date(value).toLocaleString() : "";
}
