"use client";

import { useEffect, useState } from "react";
import { AuthShell } from "../../components/auth-shell";
import { examOpsRequest } from "../../lib/exam-operations";

interface InfrastructureSummary {
  version: {
    version: string;
    commitSha: string;
    environment: string;
    nodeEnvironment: string;
  };
  services: Record<string, string | { status: string; replicas: string }>;
  operations: Record<string, string | number | boolean>;
}

interface CapacitySummary {
  activeAttempts: number;
  queuedJobs: number;
  activeJobs: number;
  codeRunnerQueued: number;
  targetProfile: string;
  claim: string;
}

export default function InfrastructurePage() {
  const [infra, setInfra] = useState<InfrastructureSummary | null>(null);
  const [capacity, setCapacity] = useState<CapacitySummary | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [infraData, capacityData] = await Promise.all([
          examOpsRequest<InfrastructureSummary>("/api/v1/system/infrastructure"),
          examOpsRequest<CapacitySummary>("/api/v1/system/capacity"),
        ]);
        setInfra(infraData);
        setCapacity(capacityData);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load infrastructure status.",
        );
      }
    }
    void load();
  }, []);

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="System"
      title="Infrastructure"
    >
      {message && <div className="error-panel">{message}</div>}
      {infra && (
        <>
          <section className="stats-grid">
            <div className="stat-card">
              <span>Environment</span>
              <strong>{infra.version.environment}</strong>
            </div>
            <div className="stat-card">
              <span>Version</span>
              <strong>{infra.version.version}</strong>
            </div>
            <div className="stat-card">
              <span>Commit</span>
              <strong>{infra.version.commitSha}</strong>
            </div>
          </section>
          <section className="panel">
            <h2>Services</h2>
            <div className="stats-grid">
              {Object.entries(infra.services).map(([name, value]) => {
                const status =
                  typeof value === "string" ? value : value.status;
                return (
                  <div className="metric-card" key={name}>
                    <span>{name}</span>
                    <strong>{status}</strong>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
      {capacity && (
        <section className="panel">
          <h2>Capacity</h2>
          <div className="stats-grid">
            <div className="metric-card">
              <span>Active Attempts</span>
              <strong>{capacity.activeAttempts}</strong>
            </div>
            <div className="metric-card">
              <span>Queue Backlog</span>
              <strong>{capacity.queuedJobs}</strong>
            </div>
            <div className="metric-card">
              <span>Code Runner Queue</span>
              <strong>{capacity.codeRunnerQueued}</strong>
            </div>
          </div>
          <p className="muted">{capacity.claim}</p>
        </section>
      )}
    </AuthShell>
  );
}
