"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import { PublicSaasPage } from "../../components/saas-pages";
import { saasRequest } from "../../lib/saas";

export default function InstitutionSignupPage() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setPending(true);
      const result = await saasRequest<{ message: string }>("/api/v1/tenants/signup", {
        method: "POST",
        body: JSON.stringify({
          institutionName: field(form, "institutionName"),
          institutionCode: field(form, "institutionCode"),
          adminName: field(form, "adminName"),
          adminEmail: field(form, "adminEmail"),
          phone: field(form, "phone"),
          website: field(form, "website") || undefined,
        }),
      });
      setMessage(result.message);
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Signup failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <PublicSaasPage
      eyebrow="Institution Signup"
      title="Create Trial"
      description="Create a tenant-isolated trial institution. Local development queues invitation email through the configured development provider."
    >
      <form className="panel form-grid" onSubmit={(event) => void submit(event)}>
        <input name="institutionName" placeholder="Institution name" required />
        <input name="institutionCode" placeholder="Institution code" required />
        <input name="adminName" placeholder="Primary administrator" required />
        <input name="adminEmail" placeholder="Administrator email" type="email" required />
        <input name="phone" placeholder="Phone" />
        <input name="website" placeholder="Website" type="url" />
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "Creating..." : "Create trial"}
        </button>
        {message && <p className="muted">{message}</p>}
      </form>
    </PublicSaasPage>
  );
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
