import { PublicSaasPage } from "../components/saas-pages";

export default function OfflinePage() {
  return (
    <PublicSaasPage
      eyebrow="PWA"
      title="Offline"
      description="The app shell can work offline, but high-stakes exams, answers, reports, tokens, and proctoring evidence are never cached for offline use."
      cards={[
        { label: "App shell", value: "Cache allowed" },
        { label: "Exam attempts", value: "Online only" },
        { label: "Sensitive data", value: "Never cached" },
      ]}
    />
  );
}
