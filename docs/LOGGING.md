# Centralized Logging

Production logs should be structured JSON and shipped to Loki, OpenSearch, Elasticsearch, or cloud-provider logging.

Fields:

- timestamp
- service
- environment
- level
- correlation ID
- request ID
- sanitized user ID
- sanitized college ID
- route
- status
- duration
- job ID
- deployment version

Always redact passwords, tokens, cookies, answers, source code, hidden tests, evidence data, API keys, and connection strings.
