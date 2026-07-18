"use client";

import {
  Archive,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  CollegeListResponse,
  CollegeStatus,
} from "../lib/colleges";

export function CollegeList() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | CollegeStatus>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "status">(
    "createdAt",
  );
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CollegeListResponse | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const url = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "10",
      sortBy,
      sortOrder: sortBy === "name" ? "asc" : "desc",
    });
    if (query) {
      params.set("search", query);
    }
    if (status !== "ALL") {
      params.set("status", status);
    }

    return `/api/v1/colleges?${params.toString()}`;
  }, [page, query, sortBy, status]);

  useEffect(() => {
    let active = true;
    setLoadState("loading");
    apiRequest<CollegeListResponse>(url)
      .then((response) => {
        if (active) {
          setData(response);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (active) {
          setLoadState("error");
        }
      });

    return () => {
      active = false;
    };
  }, [url]);

  async function updateStatus(
    id: string,
    nextStatus: CollegeStatus,
  ): Promise<void> {
    await apiRequest(`/api/v1/colleges/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    setActionMessage(
      `College ${nextStatus === "ACTIVE" ? "activated" : "deactivated"}.`,
    );
    setPage(1);
    setData(null);
    setLoadState("loading");
  }

  async function archive(id: string): Promise<void> {
    const confirmed = window.confirm(
      "Archive this college? Existing users, tests, and assessment history will be preserved, but the college will become inactive.",
    );
    if (!confirmed) {
      return;
    }
    await apiRequest(`/api/v1/colleges/${id}`, { method: "DELETE" });
    setActionMessage("College archived safely.");
    setPage(1);
    setData(null);
    setLoadState("loading");
  }

  return (
    <>
      <section className="toolbar">
        <div className="search-box">
          <Search aria-hidden="true" />
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, code, email, city, or state"
            value={query}
          />
        </div>
        <select
          onChange={(event) => {
            setStatus(event.target.value as "ALL" | CollegeStatus);
            setPage(1);
          }}
          value={status}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select
          onChange={(event) => {
            setSortBy(event.target.value as "name" | "createdAt" | "status");
            setPage(1);
          }}
          value={sortBy}
        >
          <option value="createdAt">Newest</option>
          <option value="name">Name</option>
          <option value="status">Status</option>
        </select>
        <Link className="primary-action" href="/super-admin/colleges/new">
          <Plus aria-hidden="true" />
          Add College
        </Link>
      </section>

      {actionMessage && <div className="success-alert">{actionMessage}</div>}

      {loadState === "loading" && (
        <section className="panel skeleton-panel">
          <Loader2 className="spin" aria-hidden="true" />
          Loading colleges...
        </section>
      )}
      {loadState === "error" && (
        <section className="panel error-panel">
          Unable to load colleges.
        </section>
      )}
      {loadState === "ready" && data?.data.length === 0 && (
        <section className="panel empty-panel">
          No colleges match the current filters.
        </section>
      )}
      {loadState === "ready" && data && data.data.length > 0 && (
        <section className="panel table-panel">
          <div className="table-summary">
            <strong>{data.meta.total}</strong> colleges
          </div>
          <div className="data-table">
            <div className="data-row data-head">
              <span>Name</span>
              <span>Code</span>
              <span>Location</span>
              <span>Email</span>
              <span>Status</span>
              <span>Created</span>
              <span>Actions</span>
            </div>
            {data.data.map((college) => (
              <div className="data-row" key={college.id}>
                <strong>{college.name}</strong>
                <span>{college.collegeCode}</span>
                <span>{college.location}</span>
                <span>{college.email}</span>
                <span className={`badge ${college.status.toLowerCase()}`}>
                  {college.status}
                </span>
                <span>{new Date(college.createdAt).toLocaleDateString()}</span>
                <span className="row-actions">
                  <Link
                    href={`/super-admin/colleges/${college.id}`}
                    title="View"
                  >
                    <Eye aria-hidden="true" />
                  </Link>
                  <Link
                    href={`/super-admin/colleges/${college.id}/edit`}
                    title="Edit"
                  >
                    <Pencil aria-hidden="true" />
                  </Link>
                  <button
                    onClick={() =>
                      void updateStatus(
                        college.id,
                        college.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                      )
                    }
                    title={
                      college.status === "ACTIVE" ? "Deactivate" : "Activate"
                    }
                    type="button"
                  >
                    <Power aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => void archive(college.id)}
                    title="Archive"
                    type="button"
                  >
                    <Archive aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div className="pagination">
            <button
              disabled={page <= 1}
              onClick={() => {
                setPage((value) => value - 1);
              }}
              type="button"
            >
              Previous
            </button>
            <span>
              Page {data.meta.page} of {Math.max(data.meta.totalPages, 1)}
            </span>
            <button
              disabled={page >= data.meta.totalPages}
              onClick={() => {
                setPage((value) => value + 1);
              }}
              type="button"
            >
              Next
            </button>
          </div>
        </section>
      )}
    </>
  );
}
