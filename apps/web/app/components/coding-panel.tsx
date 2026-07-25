"use client";

import { RotateCcw, Play, Send, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { codingRequest, codingText, type CodingPageConfig } from "../lib/coding";

interface CodingPanelProps {
  config: CodingPageConfig;
  params?: Record<string, string>;
}

const starterCode: Record<string, string> = {
  python: "def solve():\n    return 'MOCK_ACCEPTED'\n\nprint(solve())\n",
  javascript: "function solve() {\n  return 'MOCK_ACCEPTED';\n}\nconsole.log(solve());\n",
  typescript: "function solve(): string {\n  return 'MOCK_ACCEPTED';\n}\nconsole.log(solve());\n",
};

export function CodingPanel({ config, params = {} }: CodingPanelProps) {
  const [data, setData] = useState<unknown>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [languageId, setLanguageId] = useState("python");
  const [fontSize, setFontSize] = useState(14);
  const [editorTheme, setEditorTheme] = useState<"light" | "dark">("light");
  const storageKey = `campustest-coding-${params.attemptId ?? "global"}-${params.attemptQuestionId ?? "draft"}`;
  const submissionId = params.submissionId ?? "";
  const [sourceCode, setSourceCode] = useState(starterCode.python ?? "");

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
      const response = await codingRequest<unknown>(endpoint);
      setData(response.data);
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Coding data could not be loaded.");
      setStatus("error");
    }
  }, [endpoint]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setSourceCode(saved);
  }, [storageKey]);

  useEffect(() => {
    if (config.mode !== "editor") void load();
  }, [config.mode, load]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, sourceCode);
  }, [sourceCode, storageKey]);

  async function submit(action: "run" | "submit") {
    setMessage("");
    try {
      const path = `/api/v1/student/attempts/${params.attemptId ?? "seed-attempt"}/coding/${params.attemptQuestionId ?? "seed-question"}/${action}`;
      const response = await codingRequest<unknown>(path, {
        method: "POST",
        body: JSON.stringify({ languageId, sourceCode, stdin: "", idempotencyKey: `ui-${Date.now().toString()}` }),
      });
      setData(response.data);
      setStatus("ready");
      setMessage(action === "run" ? "Run queued with safe mock mode when configured." : "Submission receipt created.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Coding action failed.");
    }
  }

  async function action(path: string, method: "POST" | "PATCH" = "POST") {
    setMessage("");
    try {
      const response = await codingRequest<unknown>(path, {
        method,
        body: JSON.stringify({ reason: "Phase 16 UI review action.", score: 1, assessmentId: params.assessmentId }),
      });
      setData(response.data);
      setStatus("ready");
      setMessage("Action completed.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  if (config.mode === "editor") {
    return (
      <section className="coding-layout">
        <div className="coding-toolbar">
          <label>
            <span>Language</span>
            <select onChange={(event) => { setLanguageId(event.target.value); }} value={languageId}>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
            </select>
          </label>
          <label>
            <span>Font Size</span>
            <input min="12" max="22" onChange={(event) => { setFontSize(Number(event.target.value)); }} type="number" value={fontSize} />
          </label>
          <label>
            <span>Theme</span>
            <select onChange={(event) => { setEditorTheme(event.target.value as "light" | "dark"); }} value={editorTheme}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <button className="secondary-action" onClick={() => { setSourceCode(starterCode[languageId] ?? starterCode.python ?? ""); }} type="button"><RotateCcw aria-hidden="true" />Reset</button>
          <button className="secondary-action" onClick={() => void submit("run")} type="button"><Play aria-hidden="true" />Run</button>
          <button className="primary-action" onClick={() => void submit("submit")} type="button"><Send aria-hidden="true" />Submit</button>
        </div>
        <label className="sr-only" htmlFor="coding-editor">Source code editor</label>
        <textarea
          aria-label="Source code editor"
          className={`coding-editor ${editorTheme}`}
          id="coding-editor"
          onChange={(event) => { setSourceCode(event.target.value); }}
          spellCheck={false}
          style={{ fontSize }}
          value={sourceCode}
        />
        {message && <div className={status === "error" ? "status error" : "status ok"}>{message}</div>}
        <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
      </section>
    );
  }

  const rows = Array.isArray((data as Record<string, unknown> | null)?.data)
    ? ((data as { data: unknown[] }).data)
    : data
      ? [data]
      : [];

  return (
    <section className="stack">
      <div className="toolbar">
        <button className="secondary-action" onClick={() => { void load(); }} type="button"><RefreshCw aria-hidden="true" />Refresh</button>
        {config.mode === "review-detail" && (
          <>
            <button className="secondary-action" onClick={() => { void action(`/api/v1/coding/submissions/${submissionId}/rejudge`); }} type="button">Rejudge</button>
            <button className="secondary-action" onClick={() => { void action(`/api/v1/coding/submissions/${submissionId}/hold`); }} type="button">Hold</button>
            <button className="secondary-action" onClick={() => { void action(`/api/v1/coding/submissions/${submissionId}/release`); }} type="button">Release</button>
          </>
        )}
        {config.mode === "plagiarism" && (
          <button className="primary-action" onClick={() => { void action("/api/v1/coding/plagiarism/jobs"); }} type="button">Create Job</button>
        )}
      </div>
      {message && <div className={status === "error" ? "status error" : "status ok"}>{message}</div>}
      <div className="stats-grid">
        {rows.slice(0, 12).map((row, index) => (
          <article className="metric-card" key={index.toString()}>
            <span>{codingText((row as Record<string, unknown>).status ?? (row as Record<string, unknown>).id ?? config.title)}</span>
            <strong>{codingText((row as Record<string, unknown>).score ?? (row as Record<string, unknown>).mode ?? (row as Record<string, unknown>).displayName ?? (row as Record<string, unknown>).similarityScore)}</strong>
          </article>
        ))}
      </div>
      <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
    </section>
  );
}
