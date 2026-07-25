import { ProtectedSaasPage } from "../../components/saas-pages";

export default function DomainSettingsPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Domains"
      title="Custom Domains"
      description="Manage DNS TXT verification, CNAME guidance, certificate status, activation, disablement, and default platform fallback."
      endpoint="/api/v1/tenant/domains"
    />
  );
}
