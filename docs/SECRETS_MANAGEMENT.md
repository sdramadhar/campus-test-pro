# Secrets Management

Supported production options:

- Kubernetes Secrets as the minimum foundation
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault

Rules:

- no secrets in Git;
- no secrets in Docker images;
- no secrets in frontend bundles;
- least-privilege runtime access;
- audited access;
- documented rotation;
- startup failure when required secrets are unavailable.

Use External Secrets, CSI drivers, or provider-native injection to sync runtime secrets into the deployment environment.
