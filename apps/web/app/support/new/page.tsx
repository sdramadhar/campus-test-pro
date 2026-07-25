"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import { ProtectedSaasPage } from "../../components/saas-pages";
import { saasRequest } from "../../lib/saas";

export default function NewSupportTicketPage() {
  const [message, setMessage] = useState("");
  async function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await saasRequest("/api/v1/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: field(form, "subject"),
          category: field(form, "category") || "general",
          priority: field(form, "priority") || "NORMAL",
          message: field(form, "message"),
        }),
      });
      setMessage("Support ticket created.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create ticket.");
    }
  }
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]}
      eyebrow="Support"
      title="New Ticket"
      description="Support messages must not include student answers, raw payment details, secrets, or private proctoring evidence."
    >
      <form className="panel form-grid" onSubmit={(event) => void submit(event)}>
        <input name="subject" placeholder="Subject" required />
        <input name="category" placeholder="Category" required />
        <select name="priority" defaultValue="NORMAL">
          <option>LOW</option>
          <option>NORMAL</option>
          <option>HIGH</option>
          <option>URGENT</option>
        </select>
        <textarea name="message" placeholder="How can we help?" required />
        <button className="primary-button" type="submit">Create ticket</button>
        {message && <p className="muted">{message}</p>}
      </form>
    </ProtectedSaasPage>
  );
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
