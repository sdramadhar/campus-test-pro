"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
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

export function AiBatchGenerationPanel() {
  const [subjects, setSubjects] = useState<EntityRecord[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void aiRequest<ListResponse>("/api/v1/subjects?pageSize=100")
      .then((response) => {
        setSubjects(response.data);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Unable to load subjects.");
      });
  }, []);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await aiRequest<ApiResponse<EntityRecord>>(
      "/api/v1/ai/questions/batch-generate",
      toJsonBody({
        collegeId: formText(form, "collegeId") || undefined,
        subjectId: formText(form, "subjectId"),
        departmentId: formText(form, "departmentId") || undefined,
        semesterId: formText(form, "semesterId") || undefined,
        topic: formText(form, "topic"),
        questionType: formText(form, "questionType"),
        requestedCount: Number(formText(form, "requestedCount", "10")),
        difficulty: formText(form, "difficulty") || undefined,
        bloomLevel: formText(form, "bloomLevel") || undefined,
        marks: Number(formText(form, "marks", "1")),
        language: formText(form, "language", "English"),
        outputStyle: formText(form, "outputStyle", "review-json"),
        avoidDuplicate: true,
      }),
    );
    setMessage(`Batch queued: ${valueText(response.data.id)} (${valueText(response.data.progressPercent)}%)`);
  }

  return (
    <section className="panel ai-panel">
      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <label><span>College ID</span><input name="collegeId" /></label>
        <label><span>Subject</span><select name="subjectId" required><option value="">Select subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{valueText(subject.subjectName)}</option>)}</select></label>
        <label><span>Department ID</span><input name="departmentId" /></label>
        <label><span>Semester ID</span><input name="semesterId" /></label>
        <label><span>Topic</span><input name="topic" required /></label>
        <label><span>Question type</span><select name="questionType">{questionTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Questions</span><input defaultValue="10" max="500" min="10" name="requestedCount" type="number" /></label>
        <label><span>Difficulty</span><select name="difficulty"><option value="">Mixed</option>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Bloom</span><select name="bloomLevel"><option value="">Mixed</option>{bloomLevels.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Marks</span><input defaultValue="1" min="1" name="marks" type="number" /></label>
        <label><span>Language</span><input defaultValue="English" name="language" /></label>
        <label><span>Output format</span><input defaultValue="review-json" name="outputStyle" /></label>
        <button className="primary-action" type="submit">Generate Batch</button>
      </form>
      {message && <div className="status ok">{message}</div>}
    </section>
  );
}

export function AiPaperGeneratorPanel({ mode }: { mode: "paper" | "sets" }) {
  const [subjects, setSubjects] = useState<EntityRecord[]>([]);
  const [result, setResult] = useState<unknown>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void aiRequest<ListResponse>("/api/v1/subjects?pageSize=100")
      .then((response) => {
        setSubjects(response.data);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Unable to load subjects.");
      });
  }, []);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const path = mode === "paper" ? "/api/v1/ai/exam-engine/paper" : "/api/v1/ai/exam-engine/random-sets";
    const response = await aiRequest<ApiResponse<unknown>>(
      path,
      toJsonBody({
        collegeId: formText(form, "collegeId") || undefined,
        subjectId: formText(form, "subjectId"),
        title: formText(form, "title") || undefined,
        durationMinutes: Number(formText(form, "durationMinutes", "60")),
        totalMarks: Number(formText(form, "totalMarks", "50")),
        setCodes: mode === "sets" ? ["A", "B", "C", "D"] : undefined,
        blueprint: { source: "frontend" },
        chapterWeightage: { balanced: true },
        difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
        bloomDistribution: { REMEMBER: 20, UNDERSTAND: 30, APPLY: 30, ANALYZE: 20 },
        marksDistribution: { balanced: true },
      }),
    );
    setResult(response.data);
    setMessage(mode === "paper" ? "Draft paper generated." : "Random paper sets generated.");
  }

  return (
    <section className="panel ai-panel">
      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <label><span>College ID</span><input name="collegeId" /></label>
        <label><span>Subject</span><select name="subjectId" required><option value="">Select subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{valueText(subject.subjectName)}</option>)}</select></label>
        <label><span>Title</span><input name="title" placeholder={mode === "paper" ? "AI Midterm Paper" : "Random Paper"} /></label>
        <label><span>Duration</span><input defaultValue="60" min="1" name="durationMinutes" type="number" /></label>
        <label><span>Total marks</span><input defaultValue="50" min="1" name="totalMarks" type="number" /></label>
        <button className="primary-action" type="submit">{mode === "paper" ? "Generate Paper" : "Generate Sets A-D"}</button>
      </form>
      {message && <div className="status ok">{message}</div>}
      {result !== null && <pre>{valueText(result)}</pre>}
    </section>
  );
}
