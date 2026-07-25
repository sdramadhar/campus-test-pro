"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => {
        return undefined;
      });
  }, []);

  if (!updateReady) {
    return null;
  }
  return (
    <button
      className="update-toast"
      onClick={() => {
        window.location.reload();
      }}
      type="button"
    >
      Update available
    </button>
  );
}
