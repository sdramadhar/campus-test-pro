"use client";

import {
  Download,
  FilePlus2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  academicRequest,
  EntityRecord,
  ListResponse,
  readValue,
} from "../lib/academic";
import {
  difficulties,
  nestedValue,
  questionStatuses,
  questionTypes,
} from "../lib/question-bank";

export function QuestionList() {
  const [rows, setRows] = useState<EntityRecord[]>([]);
  const [search, setSearch] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");
  const [topic, setTopic] = useState("");
  const [tag, setTag] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    const query = new URLSearchParams({
      page: String(page),
      pageSize: "10",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    if (search) query.set("search", search);
    if (questionType) query.set("questionType", questionType);
    if (difficulty) query.set("difficulty", difficulty);
    if (status) query.set("status", status);
    if (topic) query.set("topic", topic);
    if (tag) query.set("tag", tag);
    try {
      const response = await academicRequest<ListResponse>(
        `/api/v1/questions?${query.toString()}`,
      );
      setRows(response.data);
      setTotalPages(response.meta?.totalPages ?? 1);
      setState("ready");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load questions.",
      );
      setState("error");
    }
  }, [difficulty, page, questionType, search, status, tag, topic]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, next: string): Promise<void> {
    await academicRequest(`/api/v1/questions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    await load();
  }

  async function duplicate(id: string): Promise<void> {
    await academicRequest(`/api/v1/questions/${id}/duplicate`, {
      method: "POST",
    });
    await load();
  }

  async function remove(id: string): Promise<void> {
    if (!window.confirm("Archive this question?")) return;
    await academicRequest(`/api/v1/questions/${id}`, { method: "DELETE" });
    await load();
  }

  async function exportQuestions(): Promise<void> {
    const response = await academicRequest<unknown>("/api/v1/questions/export");
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(response, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "questions-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="toolbar question-toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Search questions"
            value={search}
          />
        </label>
        <select
          onChange={(event) => {
            setQuestionType(event.target.value);
          }}
          value={questionType}
        >
          <option value="">All types</option>
          {questionTypes.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          onChange={(event) => {
            setDifficulty(event.target.value);
          }}
          value={difficulty}
        >
          <option value="">All difficulty</option>
          {difficulties.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          onChange={(event) => {
            setStatus(event.target.value);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          {questionStatuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input
          onChange={(event) => {
            setTopic(event.target.value);
          }}
          placeholder="Topic"
          value={topic}
        />
        <input
          onChange={(event) => {
            setTag(event.target.value);
          }}
          placeholder="Tag"
          value={tag}
        />
        <Link className="primary-action" href="/questions/new">
          <Plus size={18} />
          Add Question
        </Link>
        <Link className="primary-action" href="/questions/import">
          <Upload size={18} />
          Import
        </Link>
        <button
          className="primary-action"
          onClick={() => void exportQuestions()}
          type="button"
        >
          <Download size={18} />
          Export
        </button>
      </section>

      {state === "error" && <div className="form-alert">{message}</div>}
      <section className="panel table-panel">
        <div className="table-summary">
          {state === "loading"
            ? "Loading questions..."
            : `${String(rows.length)} questions`}
        </div>
        {rows.length === 0 && state === "ready" ? (
          <div className="empty-panel">
            No questions match the current filters.
          </div>
        ) : (
          <div className="data-table">
            <div className="data-row question-row data-head">
              <span>Title</span>
              <span>Type</span>
              <span>Subject</span>
              <span>Topic</span>
              <span>Difficulty</span>
              <span>Marks</span>
              <span>Status</span>
              <span>Creator</span>
              <span>Updated</span>
              <span>Actions</span>
            </div>
            {rows.map((row) => (
              <div className="data-row question-row" key={row.id}>
                <span>{readValue(row, "title")}</span>
                <span>{readValue(row, "questionType")}</span>
                <span>{nestedValue(row, "subject.subjectName")}</span>
                <span>{readValue(row, "topic")}</span>
                <span>{readValue(row, "difficulty")}</span>
                <span>{readValue(row, "defaultMarks")}</span>
                <span
                  className={
                    readValue(row, "status") === "ACTIVE"
                      ? "badge active"
                      : "badge inactive"
                  }
                >
                  {readValue(row, "status")}
                </span>
                <span>{nestedValue(row, "createdBy.name")}</span>
                <span>{readValue(row, "updatedAt").slice(0, 10)}</span>
                <div className="row-actions">
                  <Link href={`/questions/${row.id}`}>View</Link>
                  <Link href={`/questions/${row.id}/edit`}>
                    <Pencil size={16} />
                  </Link>
                  <button
                    onClick={() => void duplicate(row.id)}
                    title="Duplicate"
                    type="button"
                  >
                    <FilePlus2 size={16} />
                  </button>
                  <button
                    onClick={() =>
                      void updateStatus(
                        row.id,
                        readValue(row, "status") === "ACTIVE"
                          ? "INACTIVE"
                          : "ACTIVE",
                      )
                    }
                    type="button"
                  >
                    {readValue(row, "status") === "ACTIVE"
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                  <button
                    onClick={() => void updateStatus(row.id, "ARCHIVED")}
                    type="button"
                  >
                    Archive
                  </button>
                  <button
                    onClick={() => void remove(row.id)}
                    title="Delete"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pagination">
          <button
            disabled={page <= 1}
            onClick={() => {
              setPage((current) => Math.max(1, current - 1));
            }}
            type="button"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => {
              setPage((current) => current + 1);
            }}
            type="button"
          >
            Next
          </button>
        </div>
      </section>
    </>
  );
}
