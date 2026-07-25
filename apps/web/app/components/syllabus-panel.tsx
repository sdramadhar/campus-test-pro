"use client";

import Link from "next/link";
import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";
import {
  aiRequest,
  ApiResponse,
  formText,
  toJsonBody,
  valueText,
} from "../lib/ai-workflows";
import { EntityRecord, ListResponse } from "../lib/academic";

export function SyllabusPanel() {
  const [subjects, setSubjects] = useState<EntityRecord[]>([]);
  const [syllabi, setSyllabi] = useState<EntityRecord[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [subjectResponse, syllabusResponse] = await Promise.all([
      aiRequest<ListResponse>("/api/v1/subjects?pageSize=100"),
      aiRequest<{ success: true; data: EntityRecord[] }>("/api/v1/syllabi"),
    ]);
    setSubjects(subjectResponse.data);
    setSyllabi(syllabusResponse.data);
  }

  useEffect(() => {
    void load().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Unable to load syllabi.");
    });
  }, []);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await aiRequest<ApiResponse<EntityRecord>>(
      "/api/v1/syllabi",
      toJsonBody({
        collegeId: formText(form, "collegeId") || undefined,
        subjectId: formText(form, "subjectId"),
        academicYear: Number(
          formText(form, "academicYear", String(new Date().getFullYear())),
        ),
        title: formText(form, "title"),
        learningOutcomes: formText(form, "learningOutcomes").split(",").map((item) => item.trim()).filter(Boolean),
        units: [
          {
            unitNumber: 1,
            title: formText(form, "unitTitle", "Unit 1"),
            outcomes: [],
            topics: formText(form, "topics").split(",").map((topic) => ({ topicName: topic.trim() })).filter((topic) => topic.topicName),
          },
        ],
      }),
    );
    setMessage("Syllabus saved.");
    await load();
  }

  return (
    <section className="panel ai-panel">
      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <label><span>College ID</span><input name="collegeId" placeholder="Required for Super Admin" /></label>
        <label><span>Subject</span><select name="subjectId" required><option value="">Select subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{valueText(subject.subjectName)}</option>)}</select></label>
        <label><span>Academic year</span><input defaultValue={new Date().getFullYear()} name="academicYear" type="number" /></label>
        <label><span>Title</span><input defaultValue="Database Systems Syllabus" name="title" required /></label>
        <label><span>Unit title</span><input defaultValue="Relational Foundations" name="unitTitle" /></label>
        <label><span>Topics</span><input defaultValue="ER Model,Normalization,SQL Joins" name="topics" /></label>
        <label className="wide-field"><span>Learning outcomes</span><textarea defaultValue="Model relational data,Analyze query behavior" name="learningOutcomes" rows={3} /></label>
        <button className="primary-action" type="submit">Save Syllabus</button>
      </form>
      {message && <div className="status ok">{message}</div>}
      <div className="data-table">
        <div className="data-row data-head ai-syllabus-row"><span>Title</span><span>Subject</span><span>Year</span><span>Coverage</span></div>
        {syllabi.map((syllabus) => (
          <div className="data-row ai-syllabus-row" key={syllabus.id}>
            <span>{valueText(syllabus.title)}</span>
            <span>{valueText((syllabus.subject as EntityRecord | undefined)?.subjectName)}</span>
            <span>{valueText(syllabus.academicYear)}</span>
            <span><Link href={`/academic/syllabi/${syllabus.id}/coverage`}>Open</Link></span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SyllabusCoveragePanel({ syllabusId }: { syllabusId: string }) {
  const [data, setData] = useState<EntityRecord | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void aiRequest<ApiResponse<EntityRecord>>(`/api/v1/syllabi/${syllabusId}/coverage`)
      .then((response) => {
        setData(response.data);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Unable to load coverage.");
      });
  }, [syllabusId]);
  const topics = Array.isArray(data?.topics) ? data.topics as EntityRecord[] : [];
  return (
    <section className="panel table-panel">
      {message && <div className="form-alert">{message}</div>}
      <div className="data-table">
        <div className="data-row data-head ai-syllabus-row"><span>Unit</span><span>Topic</span><span>Questions</span><span>Gap</span></div>
        {topics.map((topic, index) => (
          <div className="data-row ai-syllabus-row" key={`${valueText(topic.topic)}-${String(index)}`}>
            <span>{valueText(topic.unit)}</span><span>{valueText(topic.topic)}</span><span>{valueText(topic.questionCount)}</span><span>{typeof topic.questionCount === "number" && topic.questionCount === 0 ? "Needs coverage" : "Covered"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
