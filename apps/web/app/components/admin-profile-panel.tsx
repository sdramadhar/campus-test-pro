"use client";

import { AlertCircle, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  adminRequest,
  profileSchema,
  SingleAdminResponse,
  toText,
} from "../lib/admin-panel";

export function AdminProfilePanel() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    themePreference: "SYSTEM",
    email: "",
    role: "",
    college: "",
  });
  const [state, setState] = useState<"loading" | "ready" | "saving">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminRequest<SingleAdminResponse>("/api/v1/admin-panel/profile")
      .then((response) => {
        const data = response.data;
        if (data) {
          const college =
            data.college && typeof data.college === "object"
              ? toText((data.college as Record<string, unknown>).name)
              : "";
          setForm({
            name: toText(data.name),
            phone: toText(data.phone),
            themePreference: toText(data.themePreference, "SYSTEM"),
            email: toText(data.email),
            role: toText(data.role),
            college,
          });
        }
        setState("ready");
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Unable to load.");
        setState("ready");
      });
  }, []);

  async function save(): Promise<void> {
    setState("saving");
    setMessage("");
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Please check profile.");
      setState("ready");
      return;
    }
    try {
      await adminRequest("/api/v1/admin-panel/profile", {
        method: "PATCH",
        body: JSON.stringify(parsed.data),
      });
      const theme =
        parsed.data.themePreference === "DARK"
          ? "dark"
          : parsed.data.themePreference === "LIGHT"
            ? "light"
            : "";
      if (theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem("campustest-theme", theme);
      } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.removeItem("campustest-theme");
      }
      setMessage("Profile saved.");
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
        Loading profile...
      </section>
    );
  }

  return (
    <section className="panel">
      {message && (
        <div className="success-alert">
          <AlertCircle aria-hidden="true" size={18} />
          {message}
        </div>
      )}
      <div className="entity-form">
        <div className="form-grid">
          <label className="form-field">
            Name
            <input
              onChange={(event) => {
                setForm((current) => ({ ...current, name: event.target.value }))
              }}
              value={form.name}
            />
          </label>
          <label className="form-field">
            Phone
            <input
              onChange={(event) => {
                setForm((current) => ({ ...current, phone: event.target.value }))
              }}
              value={form.phone}
            />
          </label>
          <label className="form-field">
            Theme
            <select
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  themePreference: event.target.value,
                }));
              }}
              value={form.themePreference}
            >
              <option value="SYSTEM">System</option>
              <option value="LIGHT">Light</option>
              <option value="DARK">Dark</option>
            </select>
          </label>
          <label className="form-field">
            Email
            <input disabled value={form.email} />
          </label>
          <label className="form-field">
            Role
            <input disabled value={form.role} />
          </label>
          <label className="form-field">
            College
            <input disabled value={form.college} />
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
            Save Profile
          </button>
        </div>
      </div>
    </section>
  );
}
