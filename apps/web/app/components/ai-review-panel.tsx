"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { aiRequest, AiJob, ApiResponse, valueText } from "../lib/ai-workflows";
import { EntityRecord } from "../lib/academic";

export function AiReviewPanel({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<AiJob | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  const results = useMemo(
    () => (Array.isArray(job?.results) ? job.results : []),
    [job],
  );

  const load = useCallback(async () => {
    try {
      const response = await aiRequest<ApiResponse<AiJob>>(`/api/v1/ai/jobs/${jobId}`);
      setJob(response.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load job.");
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(action: "approve" | "reject") {
    const ids = [...selected];
    if (ids.length === 0) return;
    await aiRequest(`/api/v1/ai/jobs/${jobId}/${action}`, {
      method: "POST",
      body: JSON.stringify({ resultIds: ids, reason: action === "reject" ? "Rejected in review" : undefined }),
    });
    setSelected(new Set());
    await load();
  }

  async function saveApproved() {
    const response = await aiRequest<ApiResponse<EntityRecord[]>>(
      `/api/v1/ai/jobs/${jobId}/save-approved`,
      { method: "POST" },
    );
    setMessage(`Saved ${String(response.data.length)} questions to Question Bank as DRAFT.`);
    await load();
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="panel ai-panel">
      <div className="form-alert">AI-generated content must be reviewed before use.</div>
      <div className="ai-status-grid">
        <span>Status: {valueText(job?.status)}</span>
        <span>Generated: {valueText(job?.generatedCount)}</span>
        <span>Approved: {valueText(job?.approvedCount)}</span>
        <span>Rejected: {valueText(job?.rejectedCount)}</span>
      </div>
      <div className="toolbar">
        <button onClick={() => void review("approve")} type="button">Approve selected</button>
        <button onClick={() => void review("reject")} type="button">Reject selected</button>
        <button className="primary-action" onClick={() => void saveApproved()} type="button">
          Save approved to Question Bank
        </button>
        <Link className="secondary-action" href="/questions">Question Bank</Link>
      </div>
      {message && <div className="status ok">{message}</div>}
      <div className="ai-card-grid">
        {results.map((result) => (
          <article className="ai-question-card" key={result.id}>
            <label className="check-field">
              <input
                checked={selected.has(result.id)}
                onChange={() => {
                  toggle(result.id);
                }}
                type="checkbox"
              />
              {valueText(result.reviewStatus)}
            </label>
            <h3>{valueText(result.questionText)}</h3>
            <p>{valueText(result.explanation)}</p>
            <div className="ai-status-grid">
              <span>Difficulty: {valueText(result.suggestedDifficulty)}</span>
              <span>Bloom: {valueText(result.suggestedBloomLevel)}</span>
              <span>Marks: {valueText(result.marks)}</span>
              <span>Duplicate: {result.duplicateCandidate ? "Possible" : "No"}</span>
              <span>Versions: {Array.isArray(result.versions) ? result.versions.length : 0}</span>
            </div>
            {Boolean(result.duplicateCandidate) && (
              <div className="form-alert">
                Possible duplicate question. Similarity {valueText(result.similarityScore)}.
              </div>
            )}
            <pre>{valueText(result.options)}</pre>
          </article>
        ))}
      </div>
    </section>
  );
}
