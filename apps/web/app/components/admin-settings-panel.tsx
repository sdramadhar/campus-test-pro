"use client";

import { AlertCircle, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  adminRequest,
  collegeSettingsSchema,
  SingleAdminResponse,
  toText,
} from "../lib/admin-panel";

const defaults = {
  timezone: "Asia/Kolkata",
  academicYearStartMonth: "6",
  brandingColor: "#0f5d4e",
  notificationsEnabled: true,
  examGraceMinutes: "5",
};

export function AdminSettingsPanel() {
  const [form, setForm] = useState(defaults);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminRequest<SingleAdminResponse>("/api/v1/admin-panel/college-settings")
      .then((response) => {
        if (response.data) {
          setForm({
            timezone: toText(response.data.timezone, defaults.timezone),
            academicYearStartMonth: toText(
              response.data.academicYearStartMonth ??
                defaults.academicYearStartMonth,
            ),
            brandingColor: toText(
              response.data.brandingColor ?? defaults.brandingColor,
            ),
            notificationsEnabled: Boolean(
              response.data.notificationsEnabled ?? true,
            ),
            examGraceMinutes: toText(
              response.data.examGraceMinutes ?? defaults.examGraceMinutes,
            ),
          });
        }
        setState("ready");
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Unable to load.");
        setState("error");
      });
  }, []);

  async function save(): Promise<void> {
    setState("saving");
    setMessage("");
    const parsed = collegeSettingsSchema.safeParse(form);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Please check settings.");
      setState("ready");
      return;
    }
    try {
      await adminRequest("/api/v1/admin-panel/college-settings", {
        method: "PATCH",
        body: JSON.stringify(parsed.data),
      });
      setMessage("Settings saved.");
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
      setState("ready");
    }
  }

  if (state === "loading") {
    return (
      <section className="panel skeleton-panel">
        <Loader2 className="spin" aria-hidden="true" />
        Loading college settings...
      </section>
    );
  }

  return (
    <section className="panel">
      {message && (
        <div className={state === "error" ? "form-alert" : "success-alert"}>
          <AlertCircle aria-hidden="true" size={18} />
          {message}
        </div>
      )}
      <div className="entity-form">
        <div className="form-grid">
          <label className="form-field">
            Timezone
            <input
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  timezone: event.target.value,
                }));
              }}
              value={form.timezone}
            />
          </label>
          <label className="form-field">
            Academic Year Start Month
            <input
              min="1"
              max="12"
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  academicYearStartMonth: event.target.value,
                }));
              }}
              type="number"
              value={form.academicYearStartMonth}
            />
          </label>
          <label className="form-field">
            Branding Color
            <input
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  brandingColor: event.target.value,
                }));
              }}
              type="color"
              value={form.brandingColor}
            />
          </label>
          <label className="form-field">
            Exam Grace Minutes
            <input
              min="0"
              max="60"
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  examGraceMinutes: event.target.value,
                }));
              }}
              type="number"
              value={form.examGraceMinutes}
            />
          </label>
          <label className="form-field check-field">
            <input
              checked={form.notificationsEnabled}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  notificationsEnabled: event.target.checked,
                }));
              }}
              type="checkbox"
            />
            Notifications Enabled
          </label>
        </div>
        <div className="form-actions">
          <button
            disabled={state === "saving"}
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
            Save Settings
          </button>
        </div>
      </div>
    </section>
  );
}
