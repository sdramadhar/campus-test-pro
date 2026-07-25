import type { Metadata } from "next";
import { PwaRegister } from "./components/pwa-register";
import "./styles.css";

export const metadata: Metadata = {
  title: "CampusTest Pro",
  description: "College assessment operations dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
