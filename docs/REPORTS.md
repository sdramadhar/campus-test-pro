# Reports

Phase 14 adds saved report definitions, report generation jobs, report files, schedules, and download auditing. Supported report foundations include student performance, assessment results, attendance-style exports, absentee lists, question analytics, subject analytics, batch analytics, review status, security events, AI usage, imports, and audit activity.

CSV output is generated server-side with UTF-8 content, headers, generated timestamp, and formula-injection protection. XLSX and PDF are represented as secure foundations in the model and route design; production-grade generation should use a streaming workbook library and hardened PDF renderer before external distribution.

Report files carry expiry metadata and every download creates an `ExportAudit` record.
