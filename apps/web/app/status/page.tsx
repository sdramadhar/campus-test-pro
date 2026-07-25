import { PublicSaasPage } from "../components/saas-pages";

export default function StatusPage() {
  return (
    <PublicSaasPage
      eyebrow="Platform"
      title="Status"
      description="Public service-status messages are shown only after approval for public visibility."
      endpoint="/api/v1/status"
    />
  );
}
