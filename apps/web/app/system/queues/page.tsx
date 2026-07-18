"use client";

import { useEffect, useState } from "react";
import { AuthShell } from "../../components/auth-shell";
import { QueueSummary, examOpsRequest } from "../../lib/exam-operations";

export default function QueueMonitorPage() {
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [version, setVersion] = useState<Record<string, string> | null>(null);
  const [workers, setWorkers] = useState<
    Array<{
      instanceId: string;
      healthy: boolean;
      lastSeenAt: string;
      queues: string[];
    }>
  >([]);
  const [message, setMessage] = useState("");

  async function load(): Promise<void> {
    try {
      const [queueData, versionData, workerData] = await Promise.all([
        examOpsRequest<QueueSummary[]>("/api/v1/system/queues"),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/system/version`,
        ).then((response) => response.json()) as Promise<
          Record<string, string>
        >,
        examOpsRequest<
          Array<{
            instanceId: string;
            healthy: boolean;
            lastSeenAt: string;
            queues: string[];
          }>
        >("/api/v1/system/workers"),
      ]);
      setQueues(queueData);
      setVersion(versionData);
      setWorkers(workerData);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load queues.",
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function queueAction(
    queueName: string,
    action: "pause" | "resume",
  ): Promise<void> {
    await examOpsRequest(`/api/v1/system/queues/${queueName}/${action}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await load();
  }

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="System"
      title="Queue Monitor"
    >
      {version && (
        <section className="stats-grid">
          <div className="stat-card">
            <span>Version</span>
            <strong>{version.version}</strong>
          </div>
          <div className="stat-card">
            <span>Commit</span>
            <strong>{version.commitSha}</strong>
          </div>
          <div className="stat-card">
            <span>Environment</span>
            <strong>{version.environment}</strong>
          </div>
        </section>
      )}
      <section className="panel">
        <h2>Workers</h2>
        <div className="exam-list">
          {workers.map((worker) => (
            <article className="exam-row" key={worker.instanceId}>
              <div>
                <span className="eyebrow">
                  {worker.healthy ? "healthy" : "stale"}
                </span>
                <h2>{worker.instanceId}</h2>
                <p>
                  {worker.queues.join(", ")} · last seen{" "}
                  {new Date(worker.lastSeenAt).toLocaleString()}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        {message && <div className="error-panel">{message}</div>}
        <div className="exam-list">
          {queues.map((queue) => (
            <article className="exam-row" key={queue.name}>
              <div>
                <span className="eyebrow">{queue.name}</span>
                <h2>{queue.name}</h2>
                <p>
                  waiting {queue.counts.waiting ?? 0} · active{" "}
                  {queue.counts.active ?? 0} · delayed{" "}
                  {queue.counts.delayed ?? 0} · failed{" "}
                  {queue.counts.failed ?? 0}
                </p>
              </div>
              <div className="exam-actions">
                <button
                  onClick={() => void queueAction(queue.name, "pause")}
                  type="button"
                >
                  Pause
                </button>
                <button
                  onClick={() => void queueAction(queue.name, "resume")}
                  type="button"
                >
                  Resume
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AuthShell>
  );
}
