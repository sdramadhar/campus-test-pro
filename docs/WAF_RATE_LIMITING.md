# WAF and Rate Limiting

Add WAF and app-level limits for:

- login
- password reset
- question imports
- AI generation
- assessment start
- answer save
- code execution
- proctoring events
- report exports
- signed URL generation

Limits should be tenant-aware and user-aware so one student cannot overwhelm shared services. WAF rules must avoid exposing private data in block logs.
