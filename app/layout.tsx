import type { Metadata } from "next";
import "./globals.css";
import "./lms.css";
import { LmsProvider } from "./components/LmsProvider";
import { StudacadFooter } from "./components/StudacadFooter";
import { StructuredData } from "./components/StructuredData";
import { productionOrigin, publicMetadata } from "./lib/seo";

const homeMetadata = publicMetadata({
  title: "Studacad — Botswana tutors and exam preparation",
  description:
    "Find approved tutors and published revision courses for Botswana PSLE, JCE, and BGCSE subjects.",
  path: "/",
});

export const metadata: Metadata = {
  ...homeMetadata,
  title: {
    default: "Studacad — Botswana tutors and exam preparation",
    template: "%s | Studacad",
  },
  applicationName: "Studacad",
  category: "education",
  verification: {
    google: process.env.STUDACAD_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${productionOrigin}/#organization`,
  name: "Studacad",
  url: productionOrigin,
  areaServed: { "@type": "Country", name: "Botswana" },
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${productionOrigin}/#website`,
  name: "Studacad",
  url: productionOrigin,
  publisher: { "@id": `${productionOrigin}/#organization` },
  inLanguage: "en-BW",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-BW">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <StructuredData data={organization} />
        <StructuredData data={website} />
        <LmsProvider>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <StudacadFooter />
        </LmsProvider>
      </body>
    </html>
  );
}
