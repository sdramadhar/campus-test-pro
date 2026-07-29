import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const panelSource = readFileSync(
    resolve("app/components/ai-generate-panel.tsx"),
    "utf8",
  );

  assert(panelSource.includes("configurationMessage"));
  assert(panelSource.includes("status?.configurationMessage"));
  assert(!panelSource.includes('"AI features are disabled."'));

  console.log("AI generate panel configuration tests passed.");
}

main();
