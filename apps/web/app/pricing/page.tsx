import { PublicSaasPage } from "../components/saas-pages";

export default function PricingPage() {
  return (
    <PublicSaasPage
      eyebrow="SaaS"
      title="Pricing"
      description="Compare configurable CampusTest Pro plans. Prices are shown only when configured by an administrator or billing provider."
      endpoint="/api/v1/billing/plans"
      actions={[{ href: "/signup/institution", label: "Start trial" }]}
    />
  );
}
