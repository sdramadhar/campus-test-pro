"use client";

import Link from "next/link";
import { SyntheticEvent, useState } from "react";
import { requestPasswordReset } from "../lib/auth";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    try {
      await requestPasswordReset(identifier);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={(event) => void submit(event)}>
        <div>
          <p className="eyebrow">Account recovery</p>
          <h1>Reset password</h1>
        </div>
        <label>
          Email or student ID
          <input
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value);
            }}
            required
          />
        </label>
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Sending..." : "Send reset link"}
        </button>
        {status === "sent" ? (
          <p className="success">
            If the account is eligible, reset instructions have been sent.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="error">Unable to request reset right now.</p>
        ) : null}
        <Link href="/login">Back to login</Link>
      </form>
    </main>
  );
}
