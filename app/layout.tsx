import type { Metadata } from "next";
import "./globals.css";
import "./lms.css";
import { LmsProvider } from "./components/LmsProvider";

export const metadata: Metadata = {
  title: "LingoLift — Learn with your perfect tutor",
  description: "Find an expert language tutor and make real progress with personalized one-to-one lessons."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><LmsProvider>{children}</LmsProvider></body>
    </html>
  );
}
