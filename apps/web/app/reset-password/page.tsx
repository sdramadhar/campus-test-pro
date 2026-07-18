"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, SyntheticEvent, useState } from "react";
import { resetPassword } from "../lib/auth";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    try {
      await resetPassword(token, password);
      setStatus("done");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Password reset failed.",
      );
      setStatus("error");
    }
  }

  return (
    <form className="login-card" onSubmit={(event) => void submit(event)}>
      <div>
        <p className="eyebrow">Secure reset</p>
        <h1>Choose a new password</h1>
      </div>
      <label>
        New password
        <input
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          required
          minLength={10}
        />
      </label>
      <button type="submit" disabled={status === "loading" || !token}>
        {status === "loading" ? "Updating..." : "Update password"}
      </button>
      {!token ? <p className="error">Reset token is missing.</p> : null}
      {status === "done" ? (
        <p className="success">Password updated. You can sign in now.</p>
      ) : null}
      {status === "error" ? <p className="error">{error}</p> : null}
      <Link href="/login">Back to login</Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="login-page">
      <Suspense fallback={<div className="login-card">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
