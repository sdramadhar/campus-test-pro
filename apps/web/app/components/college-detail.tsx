"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  apiRequest,
  CollegeDetail as CollegeDetailType,
} from "../lib/colleges";

export function CollegeDetail({ id }: { id: string }) {
  const [college, setCollege] = useState<CollegeDetailType | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    apiRequest<{ success: true; data: CollegeDetailType }>(
      `/api/v1/colleges/${id}`,
    )
      .then((response) => {
        if (active) {
          setCollege(response.data);
          setState("ready");
        }
      })
      .catch(() => {
        if (active) {
          setState("error");
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (state === "loading") {
    return (
      <section className="panel skeleton-panel">
        Loading college profile...
      </section>
    );
  }

  if (state === "error" || !college) {
    return (
      <section className="panel error-panel">
        Unable to load this college.
      </section>
    );
  }

  return (
    <>
      <div className="detail-actions">
        <Link className="text-link" href="/super-admin/colleges">
          <ArrowLeft aria-hidden="true" />
          Back
        </Link>
        <Link
          className="primary-action"
          href={`/super-admin/colleges/${college.id}/edit`}
        >
          <Pencil aria-hidden="true" />
          Edit
        </Link>
      </div>
      <section className="panel">
        <div className="panel-header">
          <h2>{college.name}</h2>
          <span className={`badge ${college.status.toLowerCase()}`}>
            {college.status}
          </span>
        </div>
        <div className="detail-grid">
          <Info label="College code" value={college.collegeCode} />
          <Info label="Email" value={college.email} />
          <Info label="Phone" value={college.phone ?? "Not set"} />
          <Info label="Website" value={college.website ?? "Not set"} />
          <Info
            label="Address"
            value={`${college.addressLine1}, ${college.city}, ${college.state} ${college.postalCode}`}
          />
          <Info label="Country" value={college.country} />
          <Info
            label="Created"
            value={new Date(college.createdAt).toLocaleString()}
          />
          <Info
            label="Updated"
            value={new Date(college.updatedAt).toLocaleString()}
          />
        </div>
      </section>
      <section className="metrics" aria-label="College statistics">
        <article>
          <span>Total students</span>
          <strong>{college.statistics.totalStudents}</strong>
        </article>
        <article>
          <span>Total faculty</span>
          <strong>{college.statistics.totalFaculty}</strong>
        </article>
        <article>
          <span>Total tests</span>
          <strong>{college.statistics.totalTests}</strong>
        </article>
        <article>
          <span>Active tests</span>
          <strong>{college.statistics.activeTests}</strong>
        </article>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>College Admins</h2>
          <span>{college.collegeAdmins.length}</span>
        </div>
        {college.collegeAdmins.length === 0 ? (
          <p className="body-copy">No college admins are linked yet.</p>
        ) : (
          <div className="activity-list">
            {college.collegeAdmins.map((admin) => (
              <div key={admin.id}>
                <strong>{admin.name}</strong>
                <span>{admin.email}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="panel compact-panel">
        <div className="panel-header">
          <h2>Recent Activity</h2>
          <span>Audit trail</span>
        </div>
        <div className="activity-list">
          {college.recentActivity.map((activity) => (
            <div key={activity.id}>
              <strong>{activity.event}</strong>
              <span>{new Date(activity.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
