"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";
import {
  aiRequest,
  ApiResponse,
  bloomLevels,
  formText,
  toJsonBody,
  valueText,
} from "../lib/ai-workflows";
import { EntityRecord, ListResponse } from "../lib/academic";
import { difficulties, questionTypes } from "../lib/question-bank";

export function AiGeneratePanel() {
  const [subjects, setSubjects] = useState<EntityRecord[]>([]);
  const [status, setStatus] = useState<EntityRecord | null>(null);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const configurationMessage =
    typeof status?.configurationMessage === "string"
      ? status.configurationMessage
      : "";

  useEffect(() => {
    void Promise.all([
      aiRequest<ListResponse>("/api/v1/subjects?pageSize=100"),
      aiRequest<ApiResponse<EntityRecord>>("/api/v1/ai/status"),
    ])
      .then(([subjectResponse, statusResponse]) => {
        setSubjects(subjectResponse.data);
        setStatus(statusResponse.data);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Unable to load AI controls.");
      });
  }, []);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      collegeId: formText(form, "collegeId") || undefined,
      subjectId: formText(form, "subjectId"),
      topic: formText(form, "topic"),
      unit: formText(form, "unit") || undefined,
      questionType: formText(form, "questionType"),
      requestedCount: Number(formText(form, "requestedCount") || 1),
      difficulty: formText(form, "difficulty") || undefined,
      bloomLevel: formText(form, "bloomLevel") || undefined,
      marks: Number(formText(form, "marks") || 1),
      negativeMarks: Number(formText(form, "negativeMarks") || 0),
      language: formText(form, "language") || "English",
      syllabusText: formText(form, "syllabusText") || undefined,
      sourceNotes: formText(form, "sourceNotes") || undefined,
      avoidDuplicate: form.get("avoidDuplicate") === "on",
      model: formText(form, "model") || undefined,
      temperature: Number(formText(form, "temperature") || 0.2),
      maxTokens: Number(formText(form, "maxTokens") || 1200),
      idempotencyKey: createGenerationIdempotencyKey(),
    };
    try {
      await aiRequest<ApiResponse<EntityRecord>>(
        "/api/v1/ai/questions/generate",
        toJsonBody(payload),
      );
      setMessage("Generation job queued.");
      setState("idle");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate questions.");
      setState("error");
    }
  }

  return (
    <section className="panel ai-panel">
      <div className="form-alert">
        AI-generated content must be reviewed before use.
      </div>
      <div className="ai-status-grid">
        <span>Provider: {valueText(status?.provider)}</span>
        <span>Model: {valueText(status?.model)}</span>
        <span>Quota: {valueText((status?.quota as EntityRecord | undefined)?.dailyRemaining)} daily remaining</span>
      </div>
      {configurationMessage && (
        <div className="form-alert">{configurationMessage}</div>
      )}
      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <label>
          College ID
          <input name="collegeId" placeholder="Required for Super Admin" />
        </label>
        <label>
          Subject
          <select name="subjectId" required>
            <option value="">Select subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {valueText(subject.subjectName)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Topic
          <input name="topic" required />
        </label>
        <label>
          Unit
          <input name="unit" />
        </label>
        <label>
          Question type
          <select name="questionType" required>
            {questionTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Count
          <input defaultValue="3" min="1" max="10" name="requestedCount" type="number" />
        </label>
        <label>
          Difficulty
          <select name="difficulty">
            <option value="">AI suggest</option>
            {difficulties.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Bloom level
          <select name="bloomLevel">
            <option value="">AI suggest</option>
            {bloomLevels.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Marks
          <input defaultValue="1" min="0" name="marks" type="number" />
        </label>
        <label>
          Negative marks
          <input defaultValue="0" min="0" name="negativeMarks" type="number" />
        </label>
        <label>
          Language
          <input defaultValue="English" name="language" />
        </label>
        <label>
          Model override
          <input name="model" placeholder={valueText(status?.model)} />
        </label>
        <label>
          Temperature
          <input defaultValue="0.2" max="2" min="0" name="temperature" step="0.1" type="number" />
        </label>
        <label>
          Max tokens
          <input defaultValue="1200" min="1" name="maxTokens" type="number" />
        </label>
        <label className="check-field">
          <input defaultChecked name="avoidDuplicate" type="checkbox" />
          Check duplicates
        </label>
        <label className="wide-field">
          Syllabus text
          <textarea name="syllabusText" rows={4} />
        </label>
        <label className="wide-field">
          Source notes
          <textarea name="sourceNotes" rows={4} />
        </label>
        <button className="primary-action" disabled={state === "loading"} type="submit">
          <Sparkles size={18} />
          {state === "loading" ? "Generating..." : "Generate"}
        </button>
        <Link className="secondary-action" href="/questions/ai-jobs">
          View Jobs
        </Link>
      </form>
      {message && <div className={state === "error" ? "form-alert" : "status ok"}>{message}</div>}
    </section>
  );
}

function createGenerationIdempotencyKey(): string {
  return `ai-generate-${crypto.randomUUID()}`;
}
