import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { RunnerExecutionRequest, RunnerExecutionResponse, RunnerMode } from "@campustest/code-runner-contracts";

const mode = (process.env.CODE_RUNNER_MODE ?? "MOCK").toUpperCase() as RunnerMode;
const port = Number(process.env.CODE_RUNNER_GATEWAY_PORT ?? 4100);
const token = process.env.CODE_RUNNER_INTERNAL_TOKEN;

function json(status: number, body: unknown) {
  return { status, body: JSON.stringify(body), headers: { "content-type": "application/json" } };
}

async function readBody(request: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  return Buffer.concat(chunks).toString("utf8");
}

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const url = request.url ?? "/";
  if (url === "/health") {
    const result = json(200, { success: true, data: { mode, healthy: mode !== "DISABLED", mock: mode === "MOCK" } });
    response.writeHead(result.status, result.headers);
    response.end(result.body);
    return;
  }
  if (url === "/execute" && request.method === "POST") {
    if (token && request.headers.authorization !== `Bearer ${token}`) {
      const result = json(401, { success: false, message: "Unauthorized runner request." });
      response.writeHead(result.status, result.headers);
      response.end(result.body);
      return;
    }
    if (mode !== "MOCK") {
      const result = json(503, { success: false, message: "Only MOCK gateway execution is implemented locally. Configure a hardened isolated runner for real execution." });
      response.writeHead(result.status, result.headers);
      response.end(result.body);
      return;
    }
    const body = JSON.parse(await readBody(request)) as RunnerExecutionRequest;
    const sourceHash = createHash("sha256").update(body.sourceCode).digest("hex").slice(0, 12);
    const status = body.sourceCode.includes("WRONG") ? "WRONG_ANSWER" : "ACCEPTED";
    const payload: RunnerExecutionResponse = {
      jobId: body.jobId,
      mode,
      status,
      mockResult: true,
      stdoutSanitized: `MOCK gateway output ${sourceHash}`,
      executionTimeMs: 10,
      peakMemoryKb: 1024,
    };
    const result = json(200, { success: true, data: payload });
    response.writeHead(result.status, result.headers);
    response.end(result.body);
    return;
  }
  const result = json(404, { success: false, message: "Not found." });
  response.writeHead(result.status, result.headers);
  response.end(result.body);
}

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(port, () => {
  console.log(JSON.stringify({ service: "code-runner-gateway", mode, port, mock: mode === "MOCK" }));
});
