import { privateMetadata } from "../lib/seo";
import "./login.css";

export const metadata = privateMetadata(
  "Sign in",
  "Secure Studacad account sign-in.",
);

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
