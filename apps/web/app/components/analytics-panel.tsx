"use client";

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from "react";
import {
  analyticsRequest,
  chartRows,
  flattenMetrics,
  textValue,
  type AnalyticsPageConfig,
} from "../lib/analytics";

interface AnalyticsPanelProps {
  config: AnalyticsPageConfig;
  params?: Record<string, string>;
}

export function AnalyticsPanel({ config, params = {} }: AnalyticsPanelProps) {
  const [data, setData] = useState<unknown>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ from: "", to: "", subjectId: "", assessmentId: "" });

  const endpoint = useMemo(() => {
    let path = config.endpoint;
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`[${key}]`, value);
    }
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    return config.method === "POST" ? path : `${path}${query.size ? `?${query.toString()}` : ""}`;
  }, [config.endpoint, config.method, filters, params]);

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const response = await analyticsRequest<unknown>(
        endpoint,
        config.method === "POST"
          ? {
              method: "POST",
              body: JSON.stringify({
                dimension: "subject",
                metric: "averageScore",
                from: filters.from || undefined,
                to: filters.to || undefined,
              }),
            }
          : {},
      );
      setData(response.data);
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Analytics could not be loaded.");
      setStatus("error");
    }
  }, [config.method, endpoint, filters.from, filters.to]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    await load();
  }

  async function createReport() {
    setMessage("");
    try {
      const report = await analyticsRequest<Record<string, unknown>>("/api/v1/reports", {
        method: "POST",
        body: JSON.stringify({
          name: `${config.title} Export`,
          reportType: config.title.toLowerCase().replaceAll(" ", "-"),
          columns: ["id", "name", "percentage", "status"],
          outputFormat: "CSV",
        }),
      });
      const run = await analyticsRequest<Record<string, unknown>>(
        `/api/v1/reports/${String(report.data.id)}/run`,
        { method: "POST", body: JSON.stringify({ outputFormat: "CSV" }) },
      );
      setMessage(`Report generated: ${textValue((run.data.file as Record<string, unknown>).fileName)}`);
      setData(run.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Report generation failed.");
    }
  }

  async function generateInsight() {
    setMessage("");
    try {
      const response = await analyticsRequest<unknown>("/api/v1/analytics/insights/generate", {
        method: "POST",
        body: JSON.stringify({ from: filters.from || undefined, to: filters.to || undefined }),
      });
      setData(response.data);
      setMessage("Insight generated for human review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Insight generation failed.");
    }
  }

  const metrics = flattenMetrics(data);
  const charts = chartRows(data);

  return (
    <section className="stack">
      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <label>
          <span>From</span>
          <input
            name="from"
            onChange={(event) => {
              setFilters((current) => ({ ...current, from: event.target.value }));
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
        <label>
          <span>Subject ID</span>
          <input
            name="subjectId"
            onChange={(event) => {
              setFilters((current) => ({ ...current, subjectId: event.target.value }));
            }}
            value={filters.subjectId}
          />
        </label>
        <label>
          <span>Assessment ID</span>
          <input
            name="assessmentId"
            onChange={(event) => {
              setFilters((current) => ({ ...current, assessmentId: event.target.value }));
            }}
            value={filters.assessmentId}
          />
        </label>
        <button className="primary-action" type="submit">Apply Filters</button>
        {config.reportMode && (
          <button className="secondary-action" onClick={() => void createReport()} type="button">
            Generate CSV
          </button>
        )}
        {config.insightMode && (
          <button className="secondary-action" onClick={() => void generateInsight()} type="button">
            Generate Insight
          </button>
        )}
      </form>

      {status === "loading" && <div className="route-state">Loading analytics...</div>}
      {message && <div className={status === "error" ? "status error" : "status ok"}>{message}</div>}

      {status === "ready" && (
        <>
          <section className="metric-grid">
            {metrics.length ? (
              metrics.map((metric) => (
                <article className="metric-card" key={metric.label}>
                  <span>{metric.label.replace(/([A-Z])/g, " $1").trim()}</span>
                  <strong>{textValue(metric.value)}</strong>
                </article>
              ))
            ) : (
              <div className="empty-state">No aggregate metrics are available for this filter.</div>
            )}
          </section>

          <section className="panel">
            <h2>Charts</h2>
            {charts.length ? (
              <div className="chart-table">
                {charts.map((row) => (
                  <div className="bar-row" key={row.label}>
                    <span>{row.label}</span>
                    <div aria-label={`${row.label}: ${String(row.value)}`} className="bar-track">
                      <i style={{ width: `${String(Math.min(row.value, 100))}%` }} />
                    </div>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">Charts appear once enough aggregate data exists.</div>
            )}
          </section>

          <section className="panel">
            <h2>Table Alternative</h2>
            <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
          </section>
        </>
      )}
    </section>
  );
}
