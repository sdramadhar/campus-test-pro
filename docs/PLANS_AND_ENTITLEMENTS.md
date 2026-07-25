# Plans and Entitlements

Plans are stored as `SubscriptionPlan`, `PlanVersion`, `PlanFeature`, and `PlanLimit` records. Tenant subscriptions keep a plan-version snapshot so historical behavior is auditable.

The entitlement service enforces server-side checks for tenant-scoped features such as AI generation, OCR, coding assessments, proctoring, custom branding, custom domains, API access, SSO, mobile access, white label, and data export.

Limits are visible to users. The system must return clear blocked/quota messages and must not silently hide restrictions or delete tenant data when a feature becomes unavailable.
