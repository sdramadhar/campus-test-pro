# Coding Plagiarism Foundation

Phase 16 adds a review-first similarity workflow for coding submissions.

## Detection Signals

The current foundation compares normalized source text using deterministic local similarity. It records:

- source hashes;
- normalized similarity score;
- shared-token counts;
- language;
- assessment/question links;
- review status.

## Human Review

Similarity matches are advisory. The platform does not automatically punish students or change results from similarity alone. Reviewers must inspect a match and record a decision such as cleared, suspicious, or confirmed.

## Privacy

Student-facing APIs never expose another student's source code. Review APIs remain role-protected and tenant-scoped.
