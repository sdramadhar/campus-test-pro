# Role Permission Matrix

| Area                          | SUPER_ADMIN   | COLLEGE_ADMIN | FACULTY                           | STUDENT                  |
| ----------------------------- | ------------- | ------------- | --------------------------------- | ------------------------ |
| Platform tenants              | Full access   | No access     | No access                         | No access                |
| College settings              | All colleges  | Own college   | Read limited own college          | Read limited own college |
| Departments/courses/semesters | All colleges  | Own college   | Read assigned                     | Read own enrollment      |
| Subjects/batches              | All colleges  | Own college   | Assigned subjects/batches         | Own batches              |
| Faculty management            | All colleges  | Own college   | Own profile                       | No access                |
| Student management            | All colleges  | Own college   | Assigned students where permitted | Own profile              |
| Question bank                 | All colleges  | Own college   | Assigned college/subjects         | No authoring access      |
| Assessments                   | All colleges  | Own college   | Assigned author/reviewer access   | Assigned exam access     |
| Proctoring reviews            | All colleges  | Own college   | Assigned assessments              | Own session signals      |
| Billing/subscriptions         | Platform-wide | Own college   | No access                         | No access                |
| System release readiness      | Full access   | No access     | No access                         | No access                |

Tenant isolation is enforced in backend services and guards. Frontend navigation hiding is only a convenience layer.
