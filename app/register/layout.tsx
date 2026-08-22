import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata(
  "Register",
  "Create a secure Studacad learner account.",
);

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
