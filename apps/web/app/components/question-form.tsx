"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  academicRequest,
  EntityRecord,
  ListResponse,
  readValue,
  SingleResponse,
} from "../lib/academic";
import {
  difficulties,
  questionPayload,
  questionSchema,
  questionStatuses,
  questionTypes,
  QuestionFormValues,
} from "../lib/question-bank";

const emptyQuestion: QuestionFormValues = {
  subjectId: "",
  topic: "",
  title: "",
  questionText: "",
  questionType: "SINGLE_CHOICE",
  difficulty: "MEDIUM",
  defaultMarks: 1,
  defaultNegativeMarks: 0,
  explanation: "",
  status: "DRAFT",
  tagsText: "",
  options: [
    { optionKey: "A", optionText: "", displayOrder: 1, isCorrect: true },
    { optionKey: "B", optionText: "", displayOrder: 2, isCorrect: false },
  ],
  testCases: [
    {
      input: "",
      expectedOutput: "",
      visibility: "PUBLIC",
      scoreWeight: 1,
      displayOrder: 1,
    },
  ],
};

export function QuestionForm({ questionId }: { questionId?: string }) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<EntityRecord[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">(
    questionId ? "loading" : "ready",
  );
  const [message, setMessage] = useState("");
  const storageKey = `campustest-question-draft-${questionId ?? "new"}`;

  const form = useForm<QuestionFormValues>({
    defaultValues: emptyQuestion,
  });
  const type = form.watch("questionType");
  const options = useFieldArray({ control: form.control, name: "options" });
  const testCases = useFieldArray({ control: form.control, name: "testCases" });

  useEffect(() => {
    academicRequest<ListResponse>("/api/v1/subjects?page=1&pageSize=100")
      .then((response) => {
        setSubjects(response.data);
      })
      .catch(() => {
        setSubjects([]);
      });
  }, []);

  useEffect(() => {
    if (!questionId) {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) form.reset(JSON.parse(saved) as QuestionFormValues);
      return;
    }
    academicRequest<SingleResponse>(`/api/v1/questions/${questionId}`)
      .then((response) => {
        const row = response.data;
        form.reset({
          ...emptyQuestion,
          subjectId:
            readValue(row, "subjectId") === "-"
              ? ""
              : readValue(row, "subjectId"),
          topic: readValue(row, "topic") === "-" ? "" : readValue(row, "topic"),
          title: readValue(row, "title") === "-" ? "" : readValue(row, "title"),
          questionText:
            readValue(row, "questionText") === "-"
              ? ""
              : readValue(row, "questionText"),
          questionType: (readValue(row, "questionType") === "-"
            ? "SINGLE_CHOICE"
            : readValue(
                row,
                "questionType",
              )) as QuestionFormValues["questionType"],
          difficulty: (readValue(row, "difficulty") === "-"
            ? "MEDIUM"
            : readValue(row, "difficulty")) as QuestionFormValues["difficulty"],
          defaultMarks: Number(row.defaultMarks ?? 1),
          defaultNegativeMarks: Number(row.defaultNegativeMarks ?? 0),
          explanation:
            readValue(row, "explanation") === "-"
              ? ""
              : readValue(row, "explanation"),
          status: (readValue(row, "status") === "-"
            ? "DRAFT"
            : readValue(row, "status")) as QuestionFormValues["status"],
          options: (Array.isArray(row.options)
            ? row.options
            : emptyQuestion.options) as QuestionFormValues["options"],
        });
        setState("ready");
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error ? error.message : "Unable to load question.",
        );
        setState("error");
      });
  }, [form, questionId, storageKey]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [form, storageKey]);

  const showOptions = useMemo(
    () => type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE",
    [type],
  );

  async function submit(values: QuestionFormValues): Promise<void> {
    setState("saving");
    setMessage("");
    const parsed = questionSchema.safeParse(values);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Please check the form.");
      setState("ready");
      return;
    }
    try {
      await academicRequest(
        questionId ? `/api/v1/questions/${questionId}` : "/api/v1/questions",
        {
          method: questionId ? "PATCH" : "POST",
          body: JSON.stringify(questionPayload(parsed.data)),
        },
      );
      window.localStorage.removeItem(storageKey);
      window.sessionStorage.setItem(
        "campustest-question-toast",
        questionId ? "Question updated successfully." : "Question saved successfully.",
      );
      router.push("/questions");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save question.",
      );
      setState("ready");
    }
  }

  if (state === "loading")
    return <div className="skeleton-panel">Loading question...</div>;
  if (state === "error") return <div className="error-panel">{message}</div>;

  return (
    <form
      className="entity-form"
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
    >
      {message && <div className="form-alert">{message}</div>}
      <section className="panel form-section">
        <div className="panel-header">
          <h2>Common Fields</h2>
          <span>Saved locally while editing</span>
        </div>
        <div className="form-grid">
          <label className="form-field">
            Subject
            <select {...form.register("subjectId")}>
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {readValue(subject, "subjectName")}
                </option>
              ))}
            </select>
            <small>{form.formState.errors.subjectId?.message}</small>
          </label>
          <label className="form-field">
            Type
            <select {...form.register("questionType")}>
              {questionTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Difficulty
            <select {...form.register("difficulty")}>
              {difficulties.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Status
            <select {...form.register("status")}>
              {questionStatuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Topic
            <input {...form.register("topic")} />
            <small>{form.formState.errors.topic?.message}</small>
          </label>
          <label className="form-field">
            Title
            <input {...form.register("title")} />
            <small>{form.formState.errors.title?.message}</small>
          </label>
          <label className="form-field">
            Marks
            <input type="number" {...form.register("defaultMarks")} />
          </label>
          <label className="form-field">
            Negative Marks
            <input type="number" {...form.register("defaultNegativeMarks")} />
          </label>
          <label className="form-field wide-field">
            Question Text
            <textarea {...form.register("questionText")} />
            <small>{form.formState.errors.questionText?.message}</small>
          </label>
          <label className="form-field wide-field">
            Explanation
            <textarea {...form.register("explanation")} />
          </label>
          <label className="form-field wide-field">
            Tags
            <input
              placeholder="comma separated"
              {...form.register("tagsText")}
            />
          </label>
        </div>
      </section>

      {showOptions && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>Options</h2>
            <span>Correct flags stay server-side</span>
          </div>
          {options.fields.map((field, index) => (
            <div className="option-row" key={field.id}>
              <input
                aria-label="Option key"
                {...form.register(
                  `options.${String(index)}.optionKey` as `options.${number}.optionKey`,
                )}
              />
              <input
                aria-label="Option text"
                {...form.register(
                  `options.${String(index)}.optionText` as `options.${number}.optionText`,
                )}
              />
              <label className="toggle-row">
                <input
                  type="checkbox"
                  {...form.register(
                    `options.${String(index)}.isCorrect` as `options.${number}.isCorrect`,
                  )}
                />{" "}
                Correct
              </label>
              <button
                onClick={() => {
                  options.remove(index);
                }}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            className="primary-action"
            onClick={() => {
              options.append({
                optionKey: String.fromCharCode(65 + options.fields.length),
                optionText: "",
                displayOrder: options.fields.length + 1,
                isCorrect: false,
              });
            }}
            type="button"
          >
            <Plus size={18} />
            Option
          </button>
          <small>{form.formState.errors.options?.message}</small>
        </section>
      )}

      {type === "TRUE_FALSE" && (
        <section className="panel form-section">
          <label className="form-field">
            Correct Answer
            <select {...form.register("correctBoolean")}>
              <option value="">Select</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </label>
        </section>
      )}
      {type === "FILL_IN_THE_BLANK" && (
        <section className="panel form-section">
          <label className="form-field">
            Accepted Answers
            <input
              placeholder="comma separated"
              {...form.register("acceptedAnswersText")}
            />
          </label>
        </section>
      )}
      {type === "NUMERICAL" && (
        <section className="panel form-section">
          <div className="form-grid">
            <label className="form-field">
              Accepted Number
              <input type="number" {...form.register("acceptedNumber")} />
            </label>
            <label className="form-field">
              Tolerance
              <input type="number" {...form.register("tolerance")} />
            </label>
          </div>
        </section>
      )}
      {(type === "SHORT_ANSWER" || type === "DESCRIPTIVE") && (
        <section className="panel form-section">
          <div className="form-grid">
            <label className="form-field wide-field">
              Model Answer
              <textarea {...form.register("modelAnswer")} />
            </label>
            <label className="form-field wide-field">
              Rubric
              <textarea {...form.register("rubric")} />
            </label>
          </div>
        </section>
      )}
      {type === "CODING" && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>Coding Details</h2>
            <span>Hidden tests are never student-facing</span>
          </div>
          <div className="form-grid">
            <label className="form-field wide-field">
              Problem Statement
              <textarea {...form.register("problemStatement")} />
            </label>
            <label className="form-field">
              Input Format
              <input {...form.register("inputFormat")} />
            </label>
            <label className="form-field">
              Output Format
              <input {...form.register("outputFormat")} />
            </label>
            <label className="form-field wide-field">
              Constraints
              <textarea {...form.register("constraints")} />
            </label>
            <label className="form-field">
              Time Limit MS
              <input type="number" {...form.register("timeLimitMs")} />
            </label>
            <label className="form-field">
              Memory Limit MB
              <input type="number" {...form.register("memoryLimitMb")} />
            </label>
            <label className="form-field wide-field">
              Allowed Languages
              <input
                placeholder="javascript, python"
                {...form.register("allowedLanguagesText")}
              />
            </label>
          </div>
          {testCases.fields.map((field, index) => (
            <div className="option-row test-case-row" key={field.id}>
              <input
                placeholder="Input"
                {...form.register(
                  `testCases.${String(index)}.input` as `testCases.${number}.input`,
                )}
              />
              <input
                placeholder="Expected output"
                {...form.register(
                  `testCases.${String(index)}.expectedOutput` as `testCases.${number}.expectedOutput`,
                )}
              />
              <select
                {...form.register(
                  `testCases.${String(index)}.visibility` as `testCases.${number}.visibility`,
                )}
              >
                <option>PUBLIC</option>
                <option>HIDDEN</option>
              </select>
              <button
                onClick={() => {
                  testCases.remove(index);
                }}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            className="primary-action"
            onClick={() => {
              testCases.append({
                input: "",
                expectedOutput: "",
                visibility: "PUBLIC",
                scoreWeight: 1,
                displayOrder: testCases.fields.length + 1,
              });
            }}
            type="button"
          >
            <Plus size={18} />
            Test Case
          </button>
        </section>
      )}

      <section className="panel compact-panel">
        <div className="panel-header">
          <h2>Preview</h2>
          <span>{type}</span>
        </div>
        <p className="body-copy">
          {form.watch("questionText") || "Question preview will appear here."}
        </p>
        <div className="form-actions">
          <button disabled={state === "saving"} type="submit">
            {state === "saving" ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            Save Question
          </button>
        </div>
      </section>
    </form>
  );
}
