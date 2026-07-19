"use client";

import { AlertCircle, Check, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  adminRequest,
  AdminListResponse,
} from "../lib/admin-panel";
import { EntityRecord, readValue } from "../lib/academic";

interface AdminRecordListProps {
  endpoint: string;
  columns: Array<{ key: string; label: string }>;
  emptyText: string;
  readableName: string;
  notifications?: boolean;
}

export function AdminRecordList({
  endpoint,
  columns,
  emptyText,
  readableName,
  notifications = false,
}: AdminRecordListProps) {
  const [rows, setRows] = useState<EntityRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const response = await adminRequest<AdminListResponse>(
        `${endpoint}?page=${String(page)}&pageSize=12`,
      );
      setRows(response.data);
      setTotalPages(response.meta?.totalPages ?? 1);
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load.");
      setState("error");
    }
  }, [endpoint, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string): Promise<void> {
    await adminRequest(`/api/v1/admin-panel/notifications/${id}/read`, {
      method: "PATCH",
    });
    await load();
  }

  if (state === "loading") {
    return (
      <section className="panel skeleton-panel">
        <Loader2 className="spin" aria-hidden="true" />
        Loading {readableName}...
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="panel error-panel">
        <AlertCircle aria-hidden="true" />
        {message}
      </section>
    );
  }

  return (
    <>
      <section className="toolbar compact-toolbar">
        <button
          className="primary-action"
          onClick={() => {
            void load();
          }}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={18} />
          Refresh
        </button>
      </section>
      <section className="panel table-panel">
        <div className="table-summary">
          {rows.length} {readableName} shown
        </div>
        {rows.length === 0 ? (
          <div className="empty-panel">{emptyText}</div>
        ) : (
          <div className="data-table">
            <div className="data-row admin-list-row data-head">
              {columns.map((column) => (
                <span key={column.key}>{column.label}</span>
              ))}
              {notifications && <span>Action</span>}
            </div>
            {rows.map((row) => (
              <div className="data-row admin-list-row" key={row.id}>
                {columns.map((column) => (
                  <span key={column.key}>{readValue(row, column.key)}</span>
                ))}
                {notifications && (
                  <button
                    aria-label="Mark notification as read"
                    disabled={readValue(row, "status") === "READ"}
                    onClick={() => {
                      void markRead(row.id);
                    }}
                    type="button"
                  >
                    <Check aria-hidden="true" size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="pagination">
          <button
            disabled={page <= 1}
            onClick={() => {
              setPage((current) => Math.max(1, current - 1));
            }}
            type="button"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => {
              setPage((current) => current + 1);
            }}
            type="button"
          >
            Next
          </button>
        </div>
      </section>
    </>
  );
}
