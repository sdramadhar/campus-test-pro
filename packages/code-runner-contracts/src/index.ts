export type RunnerMode = "DISABLED" | "MOCK" | "DOCKER_ISOLATED" | "REMOTE_RUNNER";

export type RunnerStatus =
  | "QUEUED"
  | "RUNNING"
  | "ACCEPTED"
  | "PARTIALLY_ACCEPTED"
  | "WRONG_ANSWER"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "OUTPUT_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "CANCELLED";

export interface RunnerExecutionRequest {
  jobId: string;
  languageId: string;
  sourceHash: string;
  sourceCode: string;
  stdin?: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  processLimit: number;
  outputLimitBytes: number;
  publicOnly: boolean;
}

export interface RunnerExecutionResponse {
  jobId: string;
  mode: RunnerMode;
  status: RunnerStatus;
  mockResult: boolean;
  stdoutSanitized?: string;
  stderrSanitized?: string;
  executionTimeMs?: number;
  peakMemoryKb?: number;
}
