"use client";

import { CalendarClock, Eye, Plus, Rocket, Save, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  academicRequest,
  EntityRecord,
  ListResponse,
  readValue,
  SingleResponse,
} from "../lib/academic";
import {
  assessmentSchema,
  AssessmentFormValues,
  assessmentStatuses,
  nestedValue,
} from "../lib/question-bank";

const emptyAssessment: AssessmentFormValues = {
  title: "",
  description: "",
  instructions: "",
  subjectId: "",
  durationMinutes: 60,
  passingMarks: "",
  maxAttempts: 1,
  shuffleQuestions: false,
  shuffleOptions: false,
};

export function AssessmentList() {
  const [rows, setRows] = useState<EntityRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [state, setState] = useState("loading");

  const load = useCallback(async () => {
    setState("loading");
    const query = new URLSearchParams({
      page: "1",
      pageSize: "20",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    if (search) query.set("search", search);
    if (status) query.set("assessmentStatus", status);
    const response = await academicRequest<ListResponse>(
      `/api/v1/assessments?${query.toString()}`,
    );
    setRows(response.data);
    setState("ready");
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <section className="toolbar assessment-toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Search assessments"
            value={search}
          />
        </label>
        <select
          onChange={(event) => {
            setStatus(event.target.value);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          {assessmentStatuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <Link className="primary-action" href="/assessments/new">
          <Plus size={18} />
          Create
        </Link>
      </section>
      <section className="panel table-panel">
        <div className="table-summary">
          {state === "loading"
            ? "Loading assessments..."
            : `${String(rows.length)} assessments`}
        </div>
        {rows.length === 0 && state === "ready" ? (
          <div className="empty-panel">No assessments yet.</div>
        ) : (
          <div className="data-table">
            <div className="data-row assessment-row data-head">
              <span>Title</span>
              <span>Subject</span>
              <span>Status</span>
              <span>Duration</span>
              <span>Total</span>
              <span>Creator</span>
              <span>Actions</span>
            </div>
            {rows.map((row) => (
              <div className="data-row assessment-row" key={row.id}>
                <span>{readValue(row, "title")}</span>
                <span>{nestedValue(row, "subject.subjectName")}</span>
                <span
                  className={
                    readValue(row, "status") === "PUBLISHED"
                      ? "badge active"
                      : "badge inactive"
                  }
                >
                  {readValue(row, "status")}
                </span>
                <span>{readValue(row, "durationMinutes")}</span>
                <span>{readValue(row, "totalMarks")}</span>
                <span>{nestedValue(row, "createdBy.name")}</span>
                <div className="row-actions">
                  <Link href={`/assessments/${row.id}`}>View</Link>
                  <Link href={`/assessments/${row.id}/edit`}>Edit</Link>
                  <Link href={`/assessments/${row.id}/assign`}>Assign</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function AssessmentBuilder({ assessmentId }: { assessmentId?: string }) {
  const [subjects, setSubjects] = useState<EntityRecord[]>([]);
  const [questions, setQuestions] = useState<EntityRecord[]>([]);
  const [batches, setBatches] = useState<EntityRecord[]>([]);
  const [students, setStudents] = useState<EntityRecord[]>([]);
  const [assessment, setAssessment] = useState<EntityRecord | null>(null);
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const form = useForm<AssessmentFormValues>({
    defaultValues: emptyAssessment,
  });

  useEffect(() => {
    void Promise.all([
      academicRequest<ListResponse>(
        "/api/v1/subjects?page=1&pageSize=100",
      ).then((response) => {
        setSubjects(response.data);
      }),
      academicRequest<ListResponse>(
        "/api/v1/questions?page=1&pageSize=100&status=ACTIVE",
      ).then((response) => {
        setQuestions(response.data);
      }),
      academicRequest<ListResponse>("/api/v1/batches?page=1&pageSize=100").then(
        (response) => {
          setBatches(response.data);
        },
      ),
      academicRequest<ListResponse>(
        "/api/v1/students?page=1&pageSize=100",
      ).then((response) => {
        setStudents(response.data);
      }),
    ]);
  }, []);

  useEffect(() => {
    if (!assessmentId) return;
    academicRequest<SingleResponse>(`/api/v1/assessments/${assessmentId}`)
      .then((response) => {
        setAssessment(response.data);
        form.reset({
          ...emptyAssessment,
          title:
            readValue(response.data, "title") === "-"
              ? ""
              : readValue(response.data, "title"),
          description:
            readValue(response.data, "description") === "-"
              ? ""
              : readValue(response.data, "description"),
          instructions:
            readValue(response.data, "instructions") === "-"
              ? ""
              : readValue(response.data, "instructions"),
          subjectId:
            readValue(response.data, "subjectId") === "-"
              ? ""
              : readValue(response.data, "subjectId"),
          durationMinutes: Number(response.data.durationMinutes ?? 60),
          passingMarks:
            response.data.passingMarks === null
              ? ""
              : Number(response.data.passingMarks ?? ""),
          maxAttempts: Number(response.data.maxAttempts ?? 1),
          shuffleQuestions: Boolean(response.data.shuffleQuestions),
          shuffleOptions: Boolean(response.data.shuffleOptions),
        });
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error ? error.message : "Unable to load assessment.",
        );
      });
  }, [assessmentId, form]);

  async function save(values: AssessmentFormValues): Promise<void> {
    const parsed = assessmentSchema.safeParse(values);
    if (!parsed.success) {
      setMessage(
        parsed.error.issues[0]?.message ?? "Please check the assessment form.",
      );
      return;
    }
    const response = await academicRequest<SingleResponse>(
      assessment?.id
        ? `/api/v1/assessments/${assessment.id}`
        : "/api/v1/assessments",
      {
        method: assessment?.id ? "PATCH" : "POST",
        body: JSON.stringify({
          ...parsed.data,
          passingMarks:
            parsed.data.passingMarks === ""
              ? undefined
              : parsed.data.passingMarks,
        }),
      },
    );
    setAssessment(response.data);
    setMessage("Assessment details saved.");
    setStep(2);
  }

  async function addSection(): Promise<void> {
    if (!assessment?.id) return;
    await academicRequest(`/api/v1/assessments/${assessment.id}/sections`, {
      method: "POST",
      body: JSON.stringify({
        name: `Section ${String(Date.now()).slice(-4)}`,
        displayOrder:
          ((assessment.sections as unknown[] | undefined)?.length ?? 0) + 1,
      }),
    });
    await reloadAssessment();
  }

  async function addQuestion(questionId: string): Promise<void> {
    if (!assessment?.id) return;
    await academicRequest(`/api/v1/assessments/${assessment.id}/questions`, {
      method: "POST",
      body: JSON.stringify({
        questionId,
        displayOrder:
          ((assessment.assessmentQuestions as unknown[] | undefined)?.length ??
            0) + 1,
        assignedMarks: 1,
        assignedNegativeMarks: 0,
        mandatory: true,
      }),
    });
    await reloadAssessment();
  }

  async function assignBatch(batchId: string): Promise<void> {
    if (!assessment?.id) return;
    await academicRequest(`/api/v1/assessments/${assessment.id}/assignments`, {
      method: "POST",
      body: JSON.stringify({ batchIds: [batchId] }),
    });
    await reloadAssessment();
  }

  async function assignStudent(studentProfileId: string): Promise<void> {
    if (!assessment?.id) return;
    await academicRequest(`/api/v1/assessments/${assessment.id}/assignments`, {
      method: "POST",
      body: JSON.stringify({ studentProfileIds: [studentProfileId] }),
    });
    await reloadAssessment();
  }

  async function schedule(): Promise<void> {
    if (!assessment?.id) return;
    const startAt = new Date(Date.now() + 60 * 60 * 1000);
    const endAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await academicRequest(`/api/v1/assessments/${assessment.id}/schedule`, {
      method: "POST",
      body: JSON.stringify({
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      }),
    });
    await reloadAssessment();
  }

  async function publish(): Promise<void> {
    if (!assessment?.id) return;
    try {
      await academicRequest(`/api/v1/assessments/${assessment.id}/publish`, {
        method: "POST",
      });
      setMessage("Assessment published.");
      await reloadAssessment();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Publish blocked.");
    }
  }

  async function reloadAssessment(): Promise<void> {
    if (!assessment?.id) return;
    const response = await academicRequest<SingleResponse>(
      `/api/v1/assessments/${assessment.id}`,
    );
    setAssessment(response.data);
  }

  return (
    <form
      className="entity-form"
      onSubmit={(event) => void form.handleSubmit(save)(event)}
    >
      {message && <div className="success-alert">{message}</div>}
      <div className="step-tabs">
        {[1, 2, 3, 4, 5, 6, 7].map((item) => (
          <button
            className={step === item ? "active-step" : ""}
            key={item}
            onClick={() => {
              setStep(item);
            }}
            type="button"
          >
            Step {item}
          </button>
        ))}
      </div>
      {step === 1 && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>Basic Details</h2>
            <span>Step 1</span>
          </div>
          <div className="form-grid">
            <label className="form-field">
              Title
              <input {...form.register("title")} />
            </label>
            <label className="form-field">
              Subject
              <select {...form.register("subjectId")}>
                <option value="">Optional</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {readValue(subject, "subjectName")}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Duration
              <input type="number" {...form.register("durationMinutes")} />
            </label>
            <label className="form-field">
              Passing Marks
              <input type="number" {...form.register("passingMarks")} />
            </label>
            <label className="form-field wide-field">
              Instructions
              <textarea {...form.register("instructions")} />
            </label>
          </div>
          <button className="primary-action" type="submit">
            <Save size={18} />
            Save and Continue
          </button>
        </section>
      )}
      {step === 2 && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>Sections</h2>
            <span>Step 2</span>
          </div>
          <button
            className="primary-action"
            onClick={() => void addSection()}
            type="button"
          >
            <Plus size={18} />
            Add Section
          </button>
          <ListItems
            rows={(assessment?.sections as EntityRecord[] | undefined) ?? []}
            labelKey="name"
          />
        </section>
      )}
      {step === 3 && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>Select Questions</h2>
            <span>Step 3</span>
          </div>
          <ListItems
            rows={questions}
            labelKey="title"
            action={(row) => (
              <button onClick={() => void addQuestion(row.id)} type="button">
                Add
              </button>
            )}
          />
        </section>
      )}
      {step === 4 && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>Marks</h2>
            <span>Step 4</span>
          </div>
          <ListItems
            rows={
              (assessment?.assessmentQuestions as EntityRecord[] | undefined) ??
              []
            }
            labelKey="assignedMarks"
          />
        </section>
      )}
      {step === 5 && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>Assign</h2>
            <span>Step 5</span>
          </div>
          <h3>Batches</h3>
          <ListItems
            rows={batches}
            labelKey="batchName"
            action={(row) => (
              <button onClick={() => void assignBatch(row.id)} type="button">
                Assign
              </button>
            )}
          />
          <h3>Students</h3>
          <ListItems
            rows={students}
            labelKey="rollNumber"
            action={(row) => (
              <button onClick={() => void assignStudent(row.id)} type="button">
                Assign
              </button>
            )}
          />
        </section>
      )}
      {step === 6 && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>Schedule</h2>
            <span>Step 6</span>
          </div>
          <button
            className="primary-action"
            onClick={() => void schedule()}
            type="button"
          >
            <CalendarClock size={18} />
            Schedule One Hour From Now
          </button>
        </section>
      )}
      {step === 7 && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>Preview and Publish</h2>
            <span>Step 7</span>
          </div>
          <p className="body-copy">
            {assessment
              ? readValue(assessment, "title")
              : "Save assessment details to preview."}
          </p>
          <div className="form-actions">
            <Link
              className="primary-action"
              href={
                assessment?.id
                  ? `/assessments/${assessment.id}/preview`
                  : "/assessments"
              }
            >
              <Eye size={18} />
              Preview
            </Link>
            <button onClick={() => void publish()} type="button">
              <Rocket size={18} />
              Publish
            </button>
          </div>
        </section>
      )}
    </form>
  );
}

function ListItems({
  rows,
  labelKey,
  action,
}: {
  rows: EntityRecord[];
  labelKey: string;
  action?: (row: EntityRecord) => ReactNode;
}) {
  return (
    <div className="activity-list">
      {rows.map((row) => (
        <div key={row.id}>
          <strong>{readValue(row, labelKey)}</strong>
          {action?.(row)}
        </div>
      ))}
    </div>
  );
}
