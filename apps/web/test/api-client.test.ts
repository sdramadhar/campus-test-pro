import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_API_URL = "https://campus-test-pro.onrender.com";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

type FetchCall = { input: RequestInfo | URL; init: RequestInit };

function inputUrl(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

function installFetch(responses: Response[]): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = (_input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input: _input, init: init ?? {} });
    const response = responses.shift();
    assert(response, "Unexpected fetch call.");
    return Promise.resolve(response);
  };
  return calls;
}

async function main(): Promise<void> {
  const { authenticatedFetch, responseErrorMessage } = await import(
    "../app/lib/api-client"
  );

  let calls = installFetch([jsonResponse({ ok: true }), jsonResponse({ ok: true })]);
  await Promise.all([
    authenticatedFetch("/api/v1/students/template"),
    authenticatedFetch("/api/v1/students/template"),
  ]);
  assert.equal(calls[0]?.init.credentials, "include");
  assert.equal(calls[1]?.init.credentials, "include");

  calls = installFetch([jsonResponse({ ok: true })]);
  await authenticatedFetch("/api/v1/students/export");
  assert.equal(calls[0]?.init.credentials, "include");

  calls = installFetch([
    jsonResponse({ message: "Authentication required" }, { status: 401 }),
    jsonResponse({ accessToken: "rotated" }),
    jsonResponse({ success: true, data: [] }),
  ]);
  const retried = await authenticatedFetch("/api/v1/students/template");
  assert.equal(retried.ok, true);
  assert.equal(calls.length, 3);
  assert.equal(calls[1]?.init.credentials, "include");
  assert.equal(calls[2]?.init.credentials, "include");
  assert.equal(inputUrl(calls[1].input), "https://campus-test-pro.onrender.com/api/v1/auth/refresh");

  calls = installFetch([
    jsonResponse({ success: true, data: { id: "ai-job-1" } }, { status: 201 }),
  ]);
  const aiBody = JSON.stringify({
    subjectId: "subject-1",
    topic: "Python",
    idempotencyKey: "ai-generate-test-key",
  });
  await authenticatedFetch("/api/v1/ai/questions/generate", {
    method: "POST",
    body: aiBody,
  });
  assert.equal(calls.length, 1);
  const validAiCall = calls[0];
  assert(validAiCall);
  assert.equal(validAiCall.init.credentials, "include");
  assert.equal(validAiCall.init.body, aiBody);

  calls = installFetch([
    jsonResponse({ message: "Authentication required" }, { status: 401 }),
    jsonResponse({ accessToken: "rotated" }),
    jsonResponse({ success: true, data: { id: "ai-job-1" } }, { status: 201 }),
  ]);
  await authenticatedFetch("/api/v1/ai/questions/generate", {
    method: "POST",
    body: aiBody,
  });
  assert.equal(calls.length, 3);
  assert.equal(
    calls.filter((call) =>
      inputUrl(call.input).endsWith("/api/v1/auth/refresh"),
    ).length,
    1,
  );
  const generateCalls = calls.filter((call) =>
    inputUrl(call.input).endsWith("/api/v1/ai/questions/generate"),
  );
  assert.equal(generateCalls.length, 2);
  assert.equal(generateCalls[0]?.init.body, aiBody);
  assert.equal(generateCalls[1]?.init.body, aiBody);

  const originalWindow = globalThis.window;
  let redirectedTo = "";
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent: () => undefined,
      location: {
        pathname: "/admin/students",
        assign: (path: string) => {
          redirectedTo = path;
        },
      },
    },
  });
  calls = installFetch([
    jsonResponse({ message: "Authentication required" }, { status: 401 }),
    jsonResponse({ message: "Authentication required" }, { status: 401 }),
  ]);
  await authenticatedFetch("/api/v1/students/export");
  assert.equal(calls.length, 2);
  assert.equal(redirectedTo, "/login");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });

  const message = await responseErrorMessage(new Response("", { status: 500 }));
  assert.equal(message, "Request failed with 500");

  console.log("Web authenticated API client tests passed.");
}

void main();
