# Object Storage

Object storage is private by default and stores question images, imports, reports, proctoring evidence, identity-check evidence, authorized coding exports, and college branding.

Requirements:

- tenant-prefixed random object keys;
- signed URLs with short expiration;
- access audit records;
- encryption in transit and at rest;
- lifecycle rules and retention;
- legal hold support for evidence where required;
- MIME validation and size limits;
- multipart-upload foundation for large imports;
- malware-scanning hook before user consumption.

Never expose raw storage keys to students. CDN caching is allowed only for public/versioned branding and static templates.
