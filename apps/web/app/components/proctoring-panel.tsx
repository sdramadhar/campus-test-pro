"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  proctoringRequest,
  proctorRows,
  proctorText,
  type ProctoringPageConfig,
} from "../lib/proctoring";

interface ProctoringPanelProps {
  config: ProctoringPageConfig;
  params?: Record<string, string>;
}

export function ProctoringPanel({ config, params = {} }: ProctoringPanelProps) {
  const [data, setData] = useState<unknown>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const endpoint = useMemo(() => {
    let path = config.endpoint;
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`[${key}]`, value);
    }
    return path;
  }, [config.endpoint, params]);

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const response = await proctoringRequest<unknown>(endpoint);
      setData(response.data);
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Proctoring data could not be loaded.");
      setStatus("error");
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: string) {
    setMessage("");
    try {
      const response = await proctoringRequest<unknown>(actionPath(action), {
        method: action === "policy" ? "POST" : action === "decision" ? "PATCH" : "POST",
        body: JSON.stringify(actionBody(action)),
      });
      setData(response.data);
      setStatus("ready");
      setMessage("Action completed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  function actionPath(action: string) {
    const assessmentId = params.assessmentId ?? "seed-assessment-active-phase7";
    const attemptId = params.attemptId ?? "seed-attempt";
    const sessionId = params.sessionId ?? "seed-proctoring-session-phase15";
    if (action === "consent") return `/api/v1/student/assessments/${assessmentId}/proctoring-consent`;
    if (action === "check") return `/api/v1/student/assessments/${assessmentId}/system-check`;
    if (action === "start") return `/api/v1/student/attempts/${attemptId}/proctoring/start`;
    if (action === "event") return `/api/v1/student/attempts/${attemptId}/proctoring/events/batch`;
    if (action === "heartbeat") return `/api/v1/student/attempts/${attemptId}/proctoring/heartbeat`;
    if (action === "warn") return `/api/v1/proctoring/sessions/${sessionId}/warn`;
    if (action === "flag") return `/api/v1/proctoring/sessions/${sessionId}/flag`;
    if (action === "decision") return `/api/v1/proctoring/reviews/${sessionId}`;
    if (action === "hold") return `/api/v1/proctoring/reviews/${sessionId}/hold-result`;
    if (action === "policy") return "/api/v1/proctoring/policies";
    if (action === "retention") return "/api/v1/proctoring/retention/run";
    return endpoint;
  }

  function actionBody(action: string) {
    if (action === "consent") return { accepted: true, consentVersion: "ui-demo-v1" };
    if (action === "check") return { browser: "CampusTest browser check", fullscreenSupported: true };
    if (action === "event") {
      return {
        events: [
          {
            eventType: "TAB_HIDDEN",
            sequenceNumber: Date.now(),
            idempotencyKey: `ui-${Date.now().toString()}`,
            clientTimestamp: new Date().toISOString(),
          },
        ],
      };
    }
    if (action === "heartbeat") {
      return { sequenceNumber: Date.now(), connectivityState: "online", fullscreenState: "active" };
    }
    if (action === "policy") {
      return {
        name: `UI Review Policy ${new Date().toISOString().slice(0, 10)}`,
        proctoringEnabled: true,
        consentRequired: true,
        fullscreenRequired: true,
        fullscreenExitPolicy: "WARN",
        tabSwitchMonitoring: true,
      };
    }
    if (action === "decision") return { decision: "NEEDS_FOLLOW_UP", reason: "Reviewed from Phase 15 UI." };
    return { reason: "Phase 15 review action.", message: "Please return to the expected exam state." };
  }

  const rows = proctorRows(data);

  return (
    <section className="stack">
      <div className="toolbar">
        <button className="secondary-action" onClick={() => void load()} type="button">Refresh</button>
        {config.mode === "student" && (
          <>
            <button className="primary-action" onClick={() => void runAction("consent")} type="button">Consent</button>
            <button className="secondary-action" onClick={() => void runAction("check")} type="button">System Check</button>
          </>
        )}
        {config.mode === "student-session" && (
          <>
            <button className="primary-action" onClick={() => void runAction("event")} type="button">Record Event</button>
            <button className="secondary-action" onClick={() => void runAction("heartbeat")} type="button">Heartbeat</button>
          </>
        )}
        {config.mode === "session" && (
          <>
            <button className="secondary-action" onClick={() => void runAction("warn")} type="button">Warn</button>
            <button className="secondary-action" onClick={() => void runAction("flag")} type="button">Flag</button>
          </>
        )}
        {config.mode === "review" && (
          <>
            <button className="secondary-action" onClick={() => void runAction("decision")} type="button">Decision</button>
            <button className="secondary-action" onClick={() => void runAction("hold")} type="button">Hold Result</button>
          </>
        )}
        {config.mode === "policies" && (
          <button className="primary-action" onClick={() => void runAction("policy")} type="button">Create Policy</button>
        )}
        {config.mode === "retention" && (
          <button className="primary-action" onClick={() => void runAction("retention")} type="button">Run Retention</button>
        )}
      </div>
      {message && <div className={status === "error" ? "status error" : "status ok"}>{message}</div>}
      <div className="stats-grid">
        {rows.length ? rows.map((row, index) => (
          <article className="metric-card" key={`${row.label}-${index.toString()}`}>
            <span>{row.label}</span>
            <strong>{proctorText(row.value)}</strong>
          </article>
        )) : (
          <article className="metric-card">
            <span>Status</span>
            <strong>{status === "loading" ? "Loading" : "Ready"}</strong>
          </article>
        )}
      </div>
      <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
    </section>
  );
}
