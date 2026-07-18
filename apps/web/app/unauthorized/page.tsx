import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="route-state">
      <h1>Unauthorized</h1>
      <p>Your account is not allowed to open that workspace.</p>
      <Link className="text-link" href="/login">
        Return to login
      </Link>
    </main>
  );
}
