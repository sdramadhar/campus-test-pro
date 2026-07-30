"use client";

import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Eye,
  Plus,
  Rocket,
  Save,
  Search,
} from "lucide-react";
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
  maxAttempts: 3,
  attemptScoringPolicy: "BEST",
  shuffleQuestions: false,
  shuffleOptions: false,
};

interface SectionDraft {
  name: string;
  description: string;
  marks: string;
  displayOrder: string;
  questionId: string;
}

interface QuestionOptionsResponse extends ListResponse {
  debug?: {
    endpoint: string;
    selectedSubjectId: string | null;
    returnedQuestionCount: number;
    status: string;
  };
}

interface QuestionOptionsDebug {
  endpoint: string;
  selectedSubjectId: string;
  returnedQuestionCount: number;
  status: string;
}

interface QuestionImportSet {
  id: string;
  name: string;
  fileName?: string | null;
  subjectId: string;
  questionCount: number;
  importedAt?: string | null;
  status: string;
  legacy: boolean;
}

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
  const [questionImportSets, setQuestionImportSets] = useState<
    QuestionImportSet[]
  >([]);
  const [batches, setBatches] = useState<EntityRecord[]>([]);
  const [students, setStudents] = useState<EntityRecord[]>([]);
  const [assessment, setAssessment] = useState<EntityRecord | null>(null);
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [questionDebug, setQuestionDebug] = useState<QuestionOptionsDebug>({
    endpoint: "/api/v1/questions",
    selectedSubjectId: "",
    returnedQuestionCount: 0,
    status: "not loaded",
  });
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    null,
  );
  const [sectionDrafts, setSectionDrafts] = useState<
    Record<string, SectionDraft>
  >({});
  const form = useForm<AssessmentFormValues>({
    defaultValues: emptyAssessment,
  });
  const selectedSubjectId = form.watch("subjectId") ?? "";
  const attachedQuestionCount =
    ((assessment?.assessmentQuestions as EntityRecord[] | undefined) ?? [])
      .length;

  useEffect(() => {
    void Promise.all([
      academicRequest<ListResponse>(
        "/api/v1/subjects?page=1&pageSize=100",
      ).then((response) => {
        setSubjects(response.data);
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

  const loadQuestionOptions = useCallback(async () => {
    const assessmentSubjectId =
      assessment && readValue(assessment, "subjectId") !== "-"
        ? readValue(assessment, "subjectId")
        : "";
    const effectiveSubjectId =
      assessmentSubjectId || selectedSubjectId;
    if (assessment?.id) {
      const endpoint = `/api/v1/assessments/${assessment.id}/question-options`;
      const [response, importSetResponse] = await Promise.all([
        academicRequest<QuestionOptionsResponse>(endpoint),
        academicRequest<{ success: true; data: QuestionImportSet[] }>(
          `/api/v1/assessments/${assessment.id}/question-import-sets`,
        ),
      ]);
      setQuestions(response.data);
      setQuestionImportSets(importSetResponse.data);
      setQuestionDebug({
        endpoint,
        selectedSubjectId:
          response.debug?.selectedSubjectId ?? effectiveSubjectId,
        returnedQuestionCount:
          response.debug?.returnedQuestionCount ?? response.data.length,
        status: response.debug?.status ?? "ACTIVE",
      });
      return;
    }
    const query = new URLSearchParams({
      page: "1",
      pageSize: "100",
      status: "ACTIVE",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    if (selectedSubjectId) {
      query.set("subjectId", selectedSubjectId);
    }
    const endpoint = `/api/v1/questions?${query.toString()}`;
    const response = await academicRequest<ListResponse>(endpoint);
    setQuestions(response.data);
    setQuestionImportSets([]);
    setQuestionDebug({
      endpoint,
      selectedSubjectId: effectiveSubjectId,
      returnedQuestionCount: response.data.length,
      status: "ACTIVE",
    });
  }, [assessment, selectedSubjectId]);

  useEffect(() => {
    const refreshQuestionData = () => {
      void loadQuestionOptions();
    };
    window.addEventListener("focus", refreshQuestionData);
    window.addEventListener("storage", refreshQuestionData);
    return () => {
      window.removeEventListener("focus", refreshQuestionData);
      window.removeEventListener("storage", refreshQuestionData);
    };
  }, [loadQuestionOptions]);

  useEffect(() => {
    loadQuestionOptions().catch((error: unknown) => {
      setQuestions([]);
      setQuestionDebug((current) => ({
        ...current,
        returnedQuestionCount: 0,
        status: "error",
      }));
      setMessage(
        error instanceof Error ? error.message : "Unable to load questions.",
      );
    });
  }, [loadQuestionOptions]);

  useEffect(() => {
    if (!assessmentId) return;
    academicRequest<SingleResponse>(`/api/v1/assessments/${assessmentId}`)
      .then((response) => {
        setAssessment(response.data);
        syncSectionDrafts(response.data, setSectionDrafts);
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
          maxAttempts: Number(response.data.maxAttempts ?? 3),
          attemptScoringPolicy:
            readValue(response.data, "attemptScoringPolicy") === "-"
              ? "BEST"
              : (readValue(response.data, "attemptScoringPolicy") as
                  | "BEST"
                  | "LATEST"
                  | "FIRST"),
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
    const response = await academicRequest<SingleResponse>(
      `/api/v1/assessments/${assessment.id}/sections`,
      {
      method: "POST",
      body: JSON.stringify({
        name: `Section ${String(Date.now()).slice(-4)}`,
        description: "",
        marks: 0,
        displayOrder:
          ((assessment.sections as unknown[] | undefined)?.length ?? 0) + 1,
      }),
      },
    );
    setExpandedSectionId(response.data.id);
    await reloadAssessment();
    await loadQuestionOptions();
  }

  async function saveSection(sectionId: string): Promise<void> {
    await persistSection(sectionId, true);
  }

  async function persistSection(
    sectionId: string,
    showMessage = false,
  ): Promise<void> {
    if (!assessment?.id) return;
    const draft = sectionDrafts[sectionId];
    if (!draft) return;
    await academicRequest(
      `/api/v1/assessments/${assessment.id}/sections/${sectionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          marks: Number(draft.marks || 0),
          displayOrder: Number(draft.displayOrder || 1),
        }),
      },
    );
    if (showMessage) setMessage("Section saved.");
    await reloadAssessment();
  }

  async function persistAllSections(): Promise<void> {
    if (!assessment?.id) return;
    const sections = (assessment.sections as EntityRecord[] | undefined) ?? [];
    for (const section of sections) {
      await persistSection(section.id);
    }
  }

  async function addQuestion(questionId: string, sectionId?: string): Promise<void> {
    if (!assessment?.id) return;
    if (sectionId) {
      await persistSection(sectionId);
    }
    const selectedQuestion = questions.find((question) => question.id === questionId);
    const assignedMarks = Number(
      selectedQuestion?.defaultMarks ?? selectedQuestion?.marks ?? 1,
    );
    await academicRequest(`/api/v1/assessments/${assessment.id}/questions`, {
      method: "POST",
      body: JSON.stringify({
        questionId,
        sectionId,
        displayOrder:
          ((assessment.assessmentQuestions as unknown[] | undefined)?.length ??
            0) + 1,
        assignedMarks: Number.isFinite(assignedMarks) ? assignedMarks : 1,
        assignedNegativeMarks: 0,
        mandatory: true,
      }),
    });
    setMessage("Question added to section.");
    await reloadAssessment();
    await loadQuestionOptions();
  }

  async function addImportSet(
    importSetId: string,
    sectionId?: string,
  ): Promise<void> {
    if (!assessment?.id) return;
    if (sectionId) {
      await persistSection(sectionId);
    }
    const response = await academicRequest<{
      success: true;
      data: { attachedCount: number; skippedCount: number };
    }>(
      `/api/v1/assessments/${assessment.id}/question-import-sets/${importSetId}/questions`,
      {
        method: "POST",
        body: JSON.stringify({ sectionId }),
      },
    );
    setMessage(
      `Attached ${String(response.data.attachedCount)} question(s) from import set. Skipped ${String(response.data.skippedCount)} already attached.`,
    );
    await reloadAssessment();
    await loadQuestionOptions();
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
      await persistAllSections();
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
    syncSectionDrafts(response.data, setSectionDrafts);
  }

  return (
    <form
      className="entity-form"
      onSubmit={(event) => void form.handleSubmit(save)(event)}
    >
      {message && <div className="success-alert">{message}</div>}
      <div className="step-tabs">
        {[1, 2, 3, 4, 5, 6, 7].map((item) => {
          const hasSections =
            ((assessment?.sections as EntityRecord[] | undefined) ?? [])
              .length > 0;
          const disabled = item >= 3 && (!hasSections || attachedQuestionCount === 0);
          return (
          <button
            className={step === item ? "active-step" : ""}
            disabled={disabled}
            key={item}
            onClick={() => {
              if (!disabled) setStep(item);
            }}
            type="button"
          >
            Step {item}
          </button>
          );
        })}
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
            <label className="form-field">
              Maximum Attempts
              <input
                max={10}
                min={1}
                type="number"
                {...form.register("maxAttempts")}
              />
            </label>
            <label className="form-field">
              Result Scoring Policy
              <select {...form.register("attemptScoringPolicy")}>
                <option value="BEST">Best score</option>
                <option value="LATEST">Latest attempt</option>
                <option value="FIRST">First attempt</option>
              </select>
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
          <SectionEditor
            assessment={assessment}
            drafts={sectionDrafts}
            expandedSectionId={expandedSectionId}
            onAddQuestion={(questionId, sectionId) =>
              void addQuestion(questionId, sectionId)
            }
            onAddImportSet={(importSetId, sectionId) =>
              void addImportSet(importSetId, sectionId)
            }
            onDraftChange={(sectionId, next) => {
              setSectionDrafts((current) => ({
                ...current,
                [sectionId]: next,
              }));
            }}
            onSaveSection={(sectionId) => void saveSection(sectionId)}
            onToggle={(sectionId) => {
              setExpandedSectionId((current) =>
                current === sectionId ? null : sectionId,
              );
              void loadQuestionOptions();
            }}
            questionDebug={questionDebug}
            questionImportSets={questionImportSets}
            questions={questions}
            subjectName={selectedSubjectName(subjects, selectedSubjectId)}
          />
          <button
            className="primary-action"
            disabled={
              ((assessment?.sections as EntityRecord[] | undefined) ?? [])
                .length === 0 || attachedQuestionCount === 0
            }
            onClick={() => void (async () => {
              await persistAllSections();
              setStep(3);
            })()}
            type="button"
          >
            Continue to Step 3
          </button>
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

function SectionEditor({
  assessment,
  drafts,
  expandedSectionId,
  questionImportSets,
  onAddQuestion,
  onAddImportSet,
  onDraftChange,
  onSaveSection,
  onToggle,
  questionDebug,
  questions,
  subjectName,
}: {
  assessment: EntityRecord | null;
  drafts: Record<string, SectionDraft>;
  expandedSectionId: string | null;
  questionImportSets: QuestionImportSet[];
  onAddQuestion: (questionId: string, sectionId: string) => void;
  onAddImportSet: (importSetId: string, sectionId: string) => void;
  onDraftChange: (sectionId: string, next: SectionDraft) => void;
  onSaveSection: (sectionId: string) => void;
  onToggle: (sectionId: string) => void;
  questionDebug: QuestionOptionsDebug;
  questions: EntityRecord[];
  subjectName: string;
}) {
  const sections = (assessment?.sections as EntityRecord[] | undefined) ?? [];
  const assignedQuestions =
    (assessment?.assessmentQuestions as EntityRecord[] | undefined) ?? [];

  if (sections.length === 0) {
    return <div className="empty-panel">Add a section to start editing.</div>;
  }

  return (
    <div className="activity-list">
      {sections.map((section) => {
        const draft = drafts[section.id] ?? draftFromSection(section);
        const isOpen = expandedSectionId === section.id;
        const attached = assignedQuestions.filter(
          (item) => readValue(item, "sectionId") === section.id,
        );
        return (
          <div className="section-editor" key={section.id}>
            <button
              className="section-toggle"
              onClick={() => {
                onToggle(section.id);
              }}
              type="button"
            >
              {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <strong>{draft.name || readValue(section, "name")}</strong>
              <span>{String(attached.length)} question(s)</span>
            </button>
            {isOpen && (
              <div className="entity-form">
                <div className="form-grid">
                  <label className="form-field">
                    Section Name
                    <input
                      onChange={(event) => {
                        onDraftChange(section.id, {
                          ...draft,
                          name: event.target.value,
                        });
                      }}
                      value={draft.name}
                    />
                  </label>
                  <label className="form-field">
                    Marks
                    <input
                      min="0"
                      onChange={(event) => {
                        onDraftChange(section.id, {
                          ...draft,
                          marks: event.target.value,
                        });
                      }}
                      type="number"
                      value={draft.marks}
                    />
                  </label>
                  <label className="form-field">
                    Question Order
                    <input
                      min="1"
                      onChange={(event) => {
                        onDraftChange(section.id, {
                          ...draft,
                          displayOrder: event.target.value,
                        });
                      }}
                      type="number"
                      value={draft.displayOrder}
                    />
                  </label>
                  <label className="form-field wide-field">
                    Description
                    <textarea
                      onChange={(event) => {
                        onDraftChange(section.id, {
                          ...draft,
                          description: event.target.value,
                        });
                      }}
                      value={draft.description}
                    />
                  </label>
                  <label className="form-field wide-field">
                    Question Bank or Question
                    <select
                      onChange={(event) => {
                        onDraftChange(section.id, {
                          ...draft,
                          questionId: event.target.value,
                        });
                      }}
                      value={draft.questionId}
                    >
                      <option value="">Select a question bank or question</option>
                      {questionImportSets.length > 0 && (
                        <optgroup label="Imported question banks">
                          {questionImportSets.map((importSet) => (
                            <option
                              key={importSet.id}
                              value={`import:${importSet.id}`}
                            >
                              {importSet.name} ({String(importSet.questionCount)} questions)
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {questions.length > 0 && (
                        <optgroup label="Individual active questions">
                          {questions.map((question) => (
                            <option key={question.id} value={`question:${question.id}`}>
                              {questionLabel(question)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </label>
                </div>
                {questions.length === 0 && questionImportSets.length === 0 && (
                  <div className="form-alert">
                    No active questions or imported question banks found for{" "}
                    {subjectName || "this subject"}.
                    Selected subject ID: {questionDebug.selectedSubjectId || "-"}.
                    Endpoint: {questionDebug.endpoint}. Returned question count:{" "}
                    {String(questionDebug.returnedQuestionCount)}.{" "}
                    <Link href="/questions">Open Question Bank</Link>
                  </div>
                )}
                <div className="form-actions">
                  <button
                    onClick={() => {
                      onSaveSection(section.id);
                    }}
                    type="button"
                  >
                    <Save size={18} />
                    Save Section
                  </button>
                  <button
                    disabled={!draft.questionId}
                    onClick={() => {
                      if (!draft.questionId) return;
                      if (draft.questionId.startsWith("import:")) {
                        onAddImportSet(
                          draft.questionId.replace(/^import:/, ""),
                          section.id,
                        );
                      } else {
                        onAddQuestion(
                          draft.questionId.replace(/^question:/, ""),
                          section.id,
                        );
                      }
                      onDraftChange(section.id, { ...draft, questionId: "" });
                    }}
                    type="button"
                  >
                    <Plus size={18} />
                    Add Question
                  </button>
                </div>
                <div className="activity-list">
                  {attached.length === 0 ? (
                    <div>No questions attached yet.</div>
                  ) : (
                    attached.map((item) => (
                      <div key={item.id}>
                        <strong>{nestedValue(item, "question.title")}</strong>
                        <span>
                          Marks {readValue(item, "assignedMarks")} · Order{" "}
                          {readValue(item, "displayOrder")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function syncSectionDrafts(
  assessment: EntityRecord,
  setSectionDrafts: (
    updater: (current: Record<string, SectionDraft>) => Record<string, SectionDraft>,
  ) => void,
): void {
  const sections = (assessment.sections as EntityRecord[] | undefined) ?? [];
  setSectionDrafts((current) => {
    const next = { ...current };
    for (const section of sections) {
      next[section.id] = next[section.id] ?? draftFromSection(section);
    }
    return next;
  });
}

function draftFromSection(section: EntityRecord): SectionDraft {
  return {
    name: readValue(section, "name") === "-" ? "" : readValue(section, "name"),
    description:
      readValue(section, "description") === "-"
        ? ""
        : readValue(section, "description"),
    marks: sectionMarks(section),
    displayOrder:
      readValue(section, "displayOrder") === "-"
        ? "1"
        : readValue(section, "displayOrder"),
    questionId: "",
  };
}

function sectionMarks(section: EntityRecord): string {
  const marksRule = section.marksRule;
  if (
    marksRule &&
    typeof marksRule === "object" &&
    "sectionMarks" in marksRule
  ) {
    const value = (marksRule as { sectionMarks?: unknown }).sectionMarks;
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }
  return "0";
}

function questionLabel(question: EntityRecord): string {
  const title = readValue(question, "title");
  if (title !== "-") return title;
  const text = readValue(question, "questionText");
  if (text !== "-") return text;
  return readValue(question, "id");
}

function selectedSubjectName(subjects: EntityRecord[], subjectId: string): string {
  const subject = subjects.find((item) => item.id === subjectId);
  return subject ? readValue(subject, "subjectName") : "this subject";
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
