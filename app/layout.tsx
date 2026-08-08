import type { Metadata } from "next";
import "./globals.css";
import "./lms.css";
import { LmsProvider } from "./components/LmsProvider";

export const metadata: Metadata = {
  title: "Studacad — Botswana tutors and exam preparation",
  description: "Find tutors and revision courses for Botswana PSLE, JCE, and BGCSE subjects."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><LmsProvider>{children}</LmsProvider></body>
    </html>
  );
}
