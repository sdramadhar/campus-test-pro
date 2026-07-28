"use client";

import {
  AlertCircle,
  Download,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Upload,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  academicRequest,
  EntityConfig,
  EntityKey,
  EntityRecord,
  entityConfigs,
  ListResponse,
  readValue,
  schemaFor,
  SingleResponse,
} from "../lib/academic";
import {
  authenticatedFetch,
  isJsonResponse,
  responseErrorMessage,
} from "../lib/api-client";

type LookupMap = Partial<Record<EntityKey, EntityRecord[]>>;

const statusOptions = ["ACTIVE", "INACTIVE"];
const genderOptions = ["NOT_SPECIFIED", "MALE", "FEMALE", "OTHER"];

export function AcademicManager({ config }: { config: EntityConfig }) {
  const [rows, setRows] = useState<EntityRecord[]>([]);
  const [lookups, setLookups] = useState<LookupMap>({});
  const [form, setForm] = useState<Record<string, string>>(initialForm(config));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [bulkText, setBulkText] = useState("");

  const schema = useMemo(() => schemaFor(config), [config]);

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const list = await academicRequest<ListResponse>(
        `${config.endpoint}?${params.toString()}`,
      );
      setRows(list.data);
      setTotalPages(list.meta?.totalPages ?? 1);
      setState("ready");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load records.",
      );
      setState("error");
    }
  }, [config.endpoint, page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sources = new Set(
      config.fields.map((field) => field.source).filter(Boolean),
    );
    for (const source of sources) {
      const key = source as EntityKey;
      academicRequest<ListResponse>(
        `${entityConfigs[key].endpoint}?page=1&pageSize=100`,
      )
        .then((response) => {
          setLookups((current) => ({ ...current, [key]: response.data }));
        })
        .catch(() => {
          return undefined;
        });
    }
  }, [config.fields]);

  async function submit(): Promise<void> {
    setState("saving");
    setMessage("");
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Please check the form.");
      setState("ready");
      return;
    }
    const payload = normalizePayload(parsed.data);
    try {
      const method = editingId ? "PATCH" : "POST";
      const path = editingId
        ? `${config.endpoint}/${editingId}`
        : config.endpoint;
      await academicRequest<SingleResponse>(path, {
        method,
        body: JSON.stringify(payload),
      });
      setForm(initialForm(config));
      setEditingId(null);
      setMessage("Saved successfully.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
      setState("ready");
    }
  }

  async function setRowStatus(
    row: EntityRecord,
    next: "ACTIVE" | "INACTIVE",
  ): Promise<void> {
    setState("saving");
    try {
      const statusPath =
        config.key === "faculty" || config.key === "students"
          ? `${config.endpoint}/${row.id}/status`
          : `${config.endpoint}/${row.id}`;
      await academicRequest<SingleResponse>(statusPath, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Status update failed.",
      );
      setState("ready");
    }
  }

  async function resetPassword(row: EntityRecord): Promise<void> {
    const password =
      config.key === "students" ? "Student@12345" : "Faculty@12345";
    await academicRequest<{ success: true }>(
      `${config.endpoint}/${row.id}/reset-password`,
      {
        method: "POST",
        body: JSON.stringify({ temporaryPassword: password }),
      },
    );
    setMessage("Temporary password reset.");
  }

  async function download(path: string, name: string): Promise<void> {
    const response = await authenticatedFetch(path);
    if (!response.ok) {
      throw new Error(await responseErrorMessage(response));
    }
    const contentType = response.headers.get("content-type") ?? "";
    const body = isJsonResponse(response)
      ? JSON.stringify((await response.json()) as unknown, null, 2)
      : await response.text();
    const blob = new Blob([body], {
      type: contentType || "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function bulkCreate(): Promise<void> {
    const parsed = JSON.parse(bulkText) as unknown;
    await academicRequest<{ success: true }>("/api/v1/students/bulk", {
      method: "POST",
      body: JSON.stringify(parsed),
    });
    setBulkText("");
    await load();
  }

  return (
    <>
      <section className="toolbar" aria-label={`${config.title} tools`}>
        <label className="search-box">
          <Search aria-hidden="true" size={18} />
          <input
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder={`Search ${config.title.toLowerCase()}`}
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
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button
          className="primary-action"
          onClick={() => {
            void load();
          }}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={18} />
          Refresh
        </button>
      </section>

      {message && (
        <div className={state === "error" ? "form-alert" : "success-alert"}>
          <AlertCircle aria-hidden="true" size={18} />
          {message}
        </div>
      )}

      {config.creatable && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>
              {editingId ? `Edit ${config.title}` : `Create ${config.title}`}
            </h2>
            <span>
              {config.editable ? "CRUD enabled" : "Create assignment"}
            </span>
          </div>
          <div className="entity-form">
            <div className="form-grid">
              {config.fields.map((field) => (
                <label className="form-field" key={field.name}>
                  {field.label}
                  {field.type === "select" ? (
                    <select
                      onChange={(event) => {
                        setFormValue(field.name, event.target.value, setForm);
                      }}
                      value={form[field.name] ?? ""}
                    >
                      <option value="">Select</option>
                      {field.name === "status" &&
                        statusOptions.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      {field.name === "gender" &&
                        genderOptions.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      {field.source &&
                        (lookups[field.source] ?? []).map((option) => (
                          <option key={option.id} value={option.id}>
                            {optionLabel(option, field.optionLabel)}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      onChange={(event) => {
                        setFormValue(field.name, event.target.value, setForm);
                      }}
                      type={field.type}
                      value={form[field.name] ?? ""}
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="form-actions">
              <button
                disabled={state === "saving"}
                onClick={() => {
                  void submit();
                }}
                type="button"
              >
                {state === "saving" ? (
                  <Loader2 className="spin" size={18} />
                ) : (
                  <Plus size={18} />
                )}
                Save
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm(config));
                  }}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {config.supportsStudentBulk && (
        <section className="panel compact-panel">
          <div className="panel-header">
            <h2>Student Import and Export</h2>
            <span>Excel-compatible JSON payloads</span>
          </div>
          <textarea
            className="bulk-box"
            onChange={(event) => {
              setBulkText(event.target.value);
            }}
            placeholder='{"students":[{"rollNumber":"CSE-2026-002","studentId":"STU-1002",...}]}'
            value={bulkText}
          />
          <div className="form-actions">
            <button
              onClick={() => {
                void bulkCreate().catch((error: unknown) => {
                  setMessage(
                    error instanceof Error ? error.message : "Student import failed.",
                  );
                });
              }}
              type="button"
            >
              <Upload size={18} />
              Import
            </button>
            <button
              onClick={() => {
                void download(
                  "/api/v1/students/template",
                  "student-import-template.json",
                ).catch((error: unknown) => {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Template download failed.",
                  );
                });
              }}
              type="button"
            >
              <Download size={18} />
              Template
            </button>
            <button
              onClick={() => {
                void download(
                  "/api/v1/students/export",
                  "students-export.json",
                ).catch((error: unknown) => {
                  setMessage(
                    error instanceof Error ? error.message : "Student export failed.",
                  );
                });
              }}
              type="button"
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </section>
      )}

      <section className="panel table-panel compact-panel">
        <div className="table-summary">
          {state === "loading"
            ? "Loading..."
            : `${String(rows.length)} records on this page`}
        </div>
        <div className="data-table">
          <div className="data-row data-head academic-row">
            {config.columns.map((column) => (
              <span key={column.key}>{column.label}</span>
            ))}
            <span>Actions</span>
          </div>
          {rows.map((row) => (
            <div className="data-row academic-row" key={row.id}>
              {config.columns.map((column) => (
                <span
                  className={
                    column.key === "status"
                      ? badgeClass(readValue(row, column.key))
                      : ""
                  }
                  key={column.key}
                >
                  {readValue(row, column.key)}
                </span>
              ))}
              <div className="row-actions">
                {config.editable && (
                  <button
                    onClick={() => {
                      editRow(row, config, setForm, setEditingId);
                    }}
                    title="Edit"
                    type="button"
                  >
                    Edit
                  </button>
                )}
                {config.supportsStatus && (
                  <button
                    onClick={() => {
                      void setRowStatus(
                        row,
                        readValue(row, "status") === "ACTIVE"
                          ? "INACTIVE"
                          : "ACTIVE",
                      );
                    }}
                    type="button"
                  >
                    {readValue(row, "status") === "ACTIVE"
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                )}
                {config.supportsReset && (
                  <button
                    onClick={() => {
                      void resetPassword(row);
                    }}
                    type="button"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
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

function initialForm(config: EntityConfig): Record<string, string> {
  return Object.fromEntries(
    config.fields.map((field) => [
      field.name,
      field.name === "status" ? "ACTIVE" : "",
    ]),
  );
}

function setFormValue(
  name: string,
  value: string,
  setForm: Dispatch<SetStateAction<Record<string, string>>>,
) {
  setForm((current) => ({ ...current, [name]: value }));
}

function normalizePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== "" && value !== undefined,
    ),
  );
}

function editRow(
  row: EntityRecord,
  config: EntityConfig,
  setForm: Dispatch<SetStateAction<Record<string, string>>>,
  setEditingId: Dispatch<SetStateAction<string | null>>,
) {
  const next = initialForm(config);
  for (const field of config.fields) {
    const value = row[field.name];
    if (typeof value === "string" || typeof value === "number") {
      next[field.name] = String(value);
    }
  }
  setEditingId(row.id);
  setForm(next);
}

function optionLabel(option: EntityRecord, override?: string): string {
  if (override) return readValue(option, override);
  return readValue(option, "departmentName") !== "-"
    ? readValue(option, "departmentName")
    : readValue(option, "courseName") !== "-"
      ? readValue(option, "courseName")
      : readValue(option, "semesterName") !== "-"
        ? readValue(option, "semesterName")
        : readValue(option, "batchName") !== "-"
          ? readValue(option, "batchName")
          : readValue(option, "user.name");
}

function badgeClass(value: string): string {
  return value === "ACTIVE" ? "badge active" : "badge inactive";
}
