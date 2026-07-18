"use client";

import { Activity, ClipboardList, LockKeyhole, School } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthShell } from "./auth-shell";
import { academicRequest } from "../lib/academic";
import { AuthUser, UserRole } from "../lib/auth";

interface DashboardViewProps {
  allowedRoles: UserRole[];
  title: string;
  eyebrow: string;
}

export function DashboardView({
  allowedRoles,
  title,
  eyebrow,
}: DashboardViewProps) {
  return (
    <AuthShell
      allowedRoles={allowedRoles}
      title={title}
      eyebrow={eyebrow}
      render={(user) => <DashboardContent user={user} />}
    />
  );
}

function DashboardContent({ user }: { user: AuthUser }) {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [examStats, setExamStats] = useState<Record<string, number> | null>(
    null,
  );

  useEffect(() => {
    if (user.role !== "SUPER_ADMIN" && user.role !== "COLLEGE_ADMIN") {
      return;
    }
    academicRequest<{ success: true; data: Record<string, number> }>(
      "/api/v1/academic/stats",
    )
      .then((response) => {
        setStats(response.data);
      })
      .catch(() => {
        setStats(null);
      });
  }, [user.role]);

  useEffect(() => {
    academicRequest<{ success: true; data: Record<string, number> }>(
      "/api/v1/exam-dashboard/stats",
    )
      .then((response) => {
        setExamStats(response.data);
      })
      .catch(() => {
        setExamStats(null);
      });
  }, []);

  return (
    <>
      <section className="metrics" aria-label="Secure platform metrics">
        <article>
          <span>Session</span>
          <strong>Active</strong>
        </article>
        <article>
          <span>Tenant</span>
          <strong>{user.collegeName ?? "Global"}</strong>
        </article>
        <article>
          <span>Account</span>
          <strong>{user.studentId ?? user.email}</strong>
        </article>
      </section>

      {stats && (
        <section className="metrics" aria-label="Academic statistics">
          {Object.entries(stats).map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>
      )}

      {examStats && (
        <section className="metrics" aria-label="Exam statistics">
          {Object.entries(examStats).map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>
                {value.toFixed(label.toLowerCase().includes("average") ? 1 : 0)}
              </strong>
            </article>
          ))}
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2>Authentication controls</h2>
          <span>{user.name}</span>
        </div>
        <div className="assessment-grid">
          <div>
            <LockKeyhole aria-hidden="true" />
            <span>Access</span>
            <strong>JWT plus HTTP-only cookies</strong>
          </div>
          <div>
            <Activity aria-hidden="true" />
            <span>Audit</span>
            <strong>Login, refresh, logout</strong>
          </div>
          <div>
            <School aria-hidden="true" />
            <span>Tenant scope</span>
            <strong>{user.collegeId ?? "Platform-wide"}</strong>
          </div>
        </div>
      </section>

      <section className="panel compact-panel">
        <div className="panel-header">
          <h2>Allowed workspace</h2>
          <span>Role-aware navigation</span>
        </div>
        <p className="body-copy">
          You are signed in as {user.role}. CampusTest Pro hides dashboards and
          navigation entries that are outside this role, while backend guards
          still enforce access on protected API routes.
        </p>
        <div className="inline-chip">
          <ClipboardList aria-hidden="true" />
          Secure route restored after refresh
        </div>
      </section>
    </>
  );
}
