"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthShell } from "./auth-shell";
import type { UserRole } from "../lib/auth";
import { compactCount, saasRequest } from "../lib/saas";
import type { ReactNode } from "react";

interface PageProps {
  title: string;
  eyebrow: string;
  description: string;
  endpoint?: string;
  allowedRoles?: UserRole[];
  publicPage?: boolean;
  actions?: Array<{ href: string; label: string }>;
  cards?: Array<{ label: string; value: string }>;
  children?: ReactNode;
}

export function PublicSaasPage(props: PageProps) {
  return (
    <main className="public-page">
      <nav className="public-nav">
        <Link href="/login">CampusTest Pro</Link>
        <div>
          <Link href="/pricing">Pricing</Link>
          <Link href="/status">Status</Link>
          <Link href="/signup/institution">Sign up</Link>
        </div>
      </nav>
      <SaasPageBody {...props} />
      {props.children}
    </main>
  );
}

export function ProtectedSaasPage(props: PageProps) {
  return (
    <AuthShell
      allowedRoles={props.allowedRoles ?? ["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow={props.eyebrow}
      title={props.title}
    >
      <SaasPageBody {...props} />
      {props.children}
    </AuthShell>
  );
}

function SaasPageBody({
  description,
  endpoint,
  actions,
  cards,
  title,
}: PageProps) {
  const [data, setData] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(Boolean(endpoint));

  useEffect(() => {
    if (!endpoint) {
      return;
    }
    const requestPath = endpoint;
    async function load(): Promise<void> {
      try {
        setLoading(true);
        setData(await saasRequest(requestPath));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load this page.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [endpoint]);

  const metrics = useMemo(() => deriveMetrics(data, cards), [data, cards]);

  return (
    <>
      <section className="panel">
        <p className="muted">{description}</p>
        {actions && (
          <div className="action-row">
            {actions.map((action) => (
              <Link className="button-link" href={action.href} key={action.href}>
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </section>
      {loading && <section className="panel">Loading {title.toLowerCase()}...</section>}
      {message && <div className="error-panel">{message}</div>}
      {metrics.length > 0 && (
        <section className="stats-grid">
          {metrics.map((metric) => (
            <div className="stat-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </section>
      )}
      {data !== null && (
        <section className="panel">
          <h2>Operational Snapshot</h2>
          <pre className="json-preview">{JSON.stringify(redact(data), null, 2)}</pre>
        </section>
      )}
    </>
  );
}

function deriveMetrics(
  data: unknown,
  fallback?: Array<{ label: string; value: string }>,
): Array<{ label: string; value: string }> {
  if (fallback) {
    return fallback;
  }
  if (!data || typeof data !== "object") {
    return [];
  }
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.plans)) {
    return [
      { label: "Plans", value: compactCount(record.plans.length) },
      { label: "Billing", value: compactCount(record.billingProvider) },
      {
        label: "Provider Status",
        value: record.billingEnabled === true ? "Enabled" : "Disabled/mock safe",
      },
    ];
  }
  return Object.entries(record)
    .filter(([, value]) => ["number", "string", "boolean"].includes(typeof value))
    .slice(0, 6)
    .map(([key, value]) => ({
      label: key.replace(/([A-Z])/g, " $1"),
      value: compactCount(value),
    }));
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      /token|secret|password|hash|cookie/i.test(key) ? "[redacted]" : redact(item),
    ]),
  );
}
