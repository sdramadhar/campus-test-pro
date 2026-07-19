"use client";

import { AlertCircle, Loader2, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminRequest } from "../lib/admin-panel";
import { EntityRecord, readValue } from "../lib/academic";

interface PermissionsResponse {
  success: true;
  data: {
    modules: string[];
    roleMatrix: EntityRecord[];
    users: EntityRecord[];
  };
}

export function AdminPermissionsPanel() {
  const [data, setData] = useState<PermissionsResponse["data"] | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedModule, setSelectedModule] = useState("students");
  const [flags, setFlags] = useState({
    canView: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  });
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const response = await adminRequest<PermissionsResponse>(
        "/api/v1/admin-panel/permissions",
      );
      setData(response.data);
      setSelectedUserId(response.data.users[0]?.id ?? "");
      setSelectedModule(response.data.modules[0] ?? "students");
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(): Promise<void> {
    setState("saving");
    setMessage("");
    try {
      await adminRequest("/api/v1/admin-panel/permissions", {
        method: "PATCH",
        body: JSON.stringify({
          userId: selectedUserId,
          module: selectedModule,
          ...flags,
        }),
      });
      setMessage("Permission override saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
      setState("ready");
    }
  }

  if (state === "loading") {
    return (
      <section className="panel skeleton-panel">
        <Loader2 className="spin" aria-hidden="true" />
        Loading permissions...
      </section>
    );
  }

  if (state === "error" || !data) {
    return (
      <section className="panel error-panel">
        <AlertCircle aria-hidden="true" />
        {message}
      </section>
    );
  }

  return (
    <>
      <section className="panel compact-panel">
        {message && <div className="success-alert">{message}</div>}
        <div className="form-grid">
          <label className="form-field">
            User
            <select
              onChange={(event) => {
                setSelectedUserId(event.target.value);
              }}
              value={selectedUserId}
            >
              {data.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {readValue(user, "name")} - {readValue(user, "role")}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Module
            <select
              onChange={(event) => {
                setSelectedModule(event.target.value);
              }}
              value={selectedModule}
            >
              {data.modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </label>
          {Object.keys(flags).map((key) => (
            <label className="form-field check-field" key={key}>
              <input
                checked={flags[key as keyof typeof flags]}
                onChange={(event) => {
                  setFlags((current) => ({
                    ...current,
                    [key]: event.target.checked,
                  }));
                }}
                type="checkbox"
              />
              {key}
            </label>
          ))}
        </div>
        <div className="form-actions">
          <button
            disabled={state === "saving" || !selectedUserId}
            onClick={() => {
              void save();
            }}
            type="button"
          >
            {state === "saving" ? (
              <Loader2 className="spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save Override
          </button>
          <button
            onClick={() => {
              void load();
            }}
            type="button"
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </button>
        </div>
      </section>
      <section className="panel table-panel">
        <div className="table-summary">Role permission matrix</div>
        <div className="data-table">
          <div className="data-row permission-row data-head">
            <span>Module</span>
            <span>Super Admin</span>
            <span>College Admin</span>
            <span>Faculty</span>
            <span>Student</span>
          </div>
          {data.roleMatrix.map((row) => (
            <div className="data-row permission-row" key={readValue(row, "module")}>
              <span>{readValue(row, "module")}</span>
              <span>{formatPermission(row.SUPER_ADMIN)}</span>
              <span>{formatPermission(row.COLLEGE_ADMIN)}</span>
              <span>{formatPermission(row.FACULTY)}</span>
              <span>{formatPermission(row.STUDENT)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function formatPermission(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "-";
  }
  const permission = value as Record<string, boolean>;
  return [
    permission.canView ? "View" : "",
    permission.canCreate ? "Create" : "",
    permission.canUpdate ? "Update" : "",
    permission.canDelete ? "Delete" : "",
  ]
    .filter(Boolean)
    .join(", ");
}
