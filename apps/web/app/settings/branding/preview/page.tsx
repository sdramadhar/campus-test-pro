import { ProtectedSaasPage } from "../../../components/saas-pages";

export default function BrandingPreviewPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Branding"
      title="Private Preview"
      description="Preview the current branding draft privately before publishing. Arbitrary CSS and JavaScript are not accepted."
      endpoint="/api/v1/tenant/branding"
    />
  );
}
