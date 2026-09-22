"use client";

import { AlertCircle, BookOpenCheck, Loader2, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SyntheticEvent, useEffect, useState } from "react";
import { roleRoutes, restoreSession, signIn } from "../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "checking" | "idle" | "loading" | "success"
  >("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    restoreSession()
      .then((user) => {
        if (!active) {
          return;
        }
        if (user) {
          router.replace(roleRoutes[user.role]);
          return;
        }
        setStatus("idle");
      })
      .catch(() => {
        setStatus("idle");
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setStatus("loading");

    try {
      const body = await signIn(identifier, password);
      setStatus("success");
      router.replace(roleRoutes[body.user.role]);
    } catch (caught) {
      setStatus("idle");
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to reach CampusTest Pro. Please try again.",
      );
    }
  }

  const loading = status === "checking" || status === "loading";

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <BookOpenCheck aria-hidden="true" />
          <span>CampusTest Pro</span>
        </div>
        <div>
          <p className="eyebrow">Secure assessment access</p>
          <h1>Sign in to your workspace</h1>
        </div>
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Email or student ID</span>
            <input
              autoComplete="username"
              disabled={loading}
              onChange={(event) => {
                setIdentifier(event.target.value);
              }}
              placeholder="student@demo-college.local"
              required
              value={identifier}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              disabled={loading}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              required
              type="password"
              value={password}
            />
          </label>
          {error && (
            <div className="form-alert">
              <AlertCircle aria-hidden="true" />
              {error}
            </div>
          )}
          {status === "success" && (
            <div className="success-alert">Login successful.</div>
          )}
          <button disabled={loading || !identifier || !password} type="submit">
            {loading ? (
              <Loader2 className="spin" aria-hidden="true" />
            ) : (
              <LogIn aria-hidden="true" />
            )}
            {status === "checking" ? "Restoring session" : "Sign in"}
          </button>
          <Link href="/forgot-password">Forgot password?</Link>
        </form>
      </section>
    </main>
  );
}
