"use client";

import { useEffect, useState } from "react";
import { apiRequest, CollegeDetail } from "../lib/colleges";
import { CollegeForm } from "./college-form";

export function CollegeEdit({ id }: { id: string }) {
  const [college, setCollege] = useState<CollegeDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    apiRequest<{ success: true; data: CollegeDetail }>(`/api/v1/colleges/${id}`)
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
        Loading college form...
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

  return <CollegeForm college={college} mode="edit" />;
}
