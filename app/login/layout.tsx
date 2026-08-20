import { privateMetadata } from "../lib/seo";

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
