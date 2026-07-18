import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
const profile = __ENV.PROFILE || "smoke";
const profiles = {
  smoke: { vus: 5, duration: "30s" },
  50: { vus: 50, duration: "2m" },
  200: { vus: 200, duration: "5m" },
  500: { vus: 500, duration: "10m" },
  1000: { vus: 1000, duration: "15m" },
  5000: { vus: 5000, duration: "30m" },
};
const selected = profiles[profile] || profiles.smoke;
const vus = Number(__ENV.VUS || selected.vus);
const duration = __ENV.DURATION || selected.duration;
const identifier = __ENV.TEST_IDENTIFIER || "student@demo-college.local";
const password = __ENV.TEST_PASSWORD || "Student@12345";
const thinkTime = Number(__ENV.THINK_TIME_SECONDS || 1);

export const options = {
  stages: [
    { duration: "30s", target: Math.min(vus, 50) },
    { duration, target: vus },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000", "p(99)<2000"],
  },
};

export default function () {
  const login = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ identifier, password }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(login, { "login ok": (response) => response.status === 200 });
  const cookies = login.cookies;
  const cookieHeader = Object.entries(cookies)
    .map(([name, values]) => `${name}=${values[0].value}`)
    .join("; ");
  const params = {
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
  };

  const assigned = http.get(`${baseUrl}/api/v1/student/assessments`, params);
  check(assigned, { "assigned ok": (response) => response.status === 200 });
  sleep(thinkTime);

  const assessments = assigned.json("data") || [];
  const assessment =
    assessments.find((item) => item.id === "seed-assessment-active-phase7") ||
    assessments[0];
  if (!assessment) {
    sleep(1);
    return;
  }

  const start = http.post(
    `${baseUrl}/api/v1/student/assessments/${assessment.id}/start`,
    JSON.stringify({
      idempotencyKey: `k6-${__VU}-${__ITER}`,
      sessionKey: `k6-${__VU}`,
    }),
    params,
  );
  check(start, {
    "start ok": (response) =>
      response.status === 201 ||
      response.status === 200 ||
      response.status === 403,
  });
  if (start.status >= 400) {
    sleep(1);
    return;
  }

  const attempt = start.json("data");
  http.get(`${baseUrl}/api/v1/student/attempts/${attempt.id}`, params);
  http.get(`${baseUrl}/api/v1/student/attempts/${attempt.id}/time`, params);
  const firstQuestion = attempt.questions && attempt.questions[0];
  if (firstQuestion) {
    http.put(
      `${baseUrl}/api/v1/student/attempts/${attempt.id}/answers/${firstQuestion.id}`,
      JSON.stringify({
        selectedOptionKeys: firstQuestion.options?.[0]?.optionKey
          ? [firstQuestion.options[0].optionKey]
          : [],
        textAnswer: "k6 answer",
      }),
      params,
    );
    http.post(
      `${baseUrl}/api/v1/student/attempts/${attempt.id}/answers/batch`,
      JSON.stringify({
        answers: [
          {
            attemptQuestionId: firstQuestion.id,
            selectedOptionKeys: firstQuestion.options?.[0]?.optionKey
              ? [firstQuestion.options[0].optionKey]
              : [],
          },
        ],
      }),
      params,
    );
  }
  http.post(
    `${baseUrl}/api/v1/student/attempts/${attempt.id}/submit`,
    JSON.stringify({ idempotencyKey: `submit-${__VU}-${__ITER}` }),
    params,
  );
  http.get(`${baseUrl}/api/v1/student/results`, params);
  sleep(thinkTime);
}
