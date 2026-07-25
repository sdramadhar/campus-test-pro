"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { aiRequest, AiJob, ApiResponse, valueText } from "../lib/ai-workflows";

interface JobsResponse {
  success: true;
  data: AiJob[];
}

export function AiJobsPanel() {
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await aiRequest<JobsResponse>("/api/v1/ai/jobs?pageSize=25");
      setJobs(response.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load AI jobs.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancel(id: string) {
    await aiRequest<ApiResponse<AiJob>>(`/api/v1/ai/jobs/${id}/cancel`, {
      method: "POST",
    });
    await load();
  }

  return (
    <section className="panel table-panel">
      <div className="toolbar">
        <button className="secondary-action" onClick={() => void load()} type="button">
          <RefreshCw size={16} />
          Refresh
        </button>
        <Link className="primary-action" href="/questions/ai-generate">
          New AI Job
        </Link>
      </div>
      {message && <div className="form-alert">{message}</div>}
      <div className="data-table">
        <div className="data-row data-head ai-job-row">
          <span>Topic</span>
          <span>Status</span>
          <span>Generated</span>
          <span>Approved</span>
          <span>Provider</span>
          <span>Actions</span>
        </div>
        {jobs.map((job) => (
          <div className="data-row ai-job-row" key={job.id}>
            <span>{valueText(job.topic)}</span>
            <span>{valueText(job.status)}</span>
            <span>{valueText(job.generatedCount)}</span>
            <span>{valueText(job.approvedCount)}</span>
            <span>{valueText(job.provider)} / {valueText(job.model)}</span>
            <span className="table-actions">
              <Link href={`/questions/ai-jobs/${job.id}`}>Open</Link>
              <Link href={`/questions/ai-review/${job.id}`}>Review</Link>
              <button onClick={() => void cancel(job.id)} type="button">Cancel</button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
