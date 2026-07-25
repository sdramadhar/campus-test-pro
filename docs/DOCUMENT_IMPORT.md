# Document Import

Phase 11 includes a safe document-ingestion foundation for question workflows.

Supported foundations:

- TXT
- CSV
- XLSX metadata path
- DOCX metadata path
- Text-based PDF metadata path

Scanned PDFs and images are marked `OCR_REQUIRED` unless `OCR_PROVIDER` is configured. Imported candidates include source references such as filename, row, page, sheet, paragraph, or chunk. All candidates require review before saving to the Question Bank.

The current local UI accepts text content for deterministic verification; production upload storage should connect this API to private object storage and malware-scanning hooks.
