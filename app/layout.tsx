import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LingoLift — Learn with your perfect tutor",
  description: "Find an expert language tutor and make real progress with personalized one-to-one lessons."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
