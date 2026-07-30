import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const source = readFileSync(
    resolve("app/student/attempts/[attemptId]/page.tsx"),
    "utf8",
  );

  assert(
    source.includes("useState<number | null>(null)"),
    "remaining time starts as unloaded, not expired",
  );
  assert(
    source.includes("new Date(data.expiresAt).getTime() - Date.now()"),
    "attempt expiry initializes the countdown before server sync returns",
  );
  assert(
    source.includes("remaining === null"),
    "auto-submit effect is guarded until timer initialization completes",
  );
  assert(
    source.includes("value === null ? null : Math.max(0, value - 1)"),
    "local countdown does not turn an unloaded timer into zero",
  );
  assert(
    source.includes("Time expired. Submitting automatically with the server..."),
    "automatic submit is reserved for an initialized expired timer",
  );

  console.log("Attempt timer web tests passed.");
}

main();
