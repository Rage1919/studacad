import type { Metadata } from "next";

export const productionOrigin = "https://studacad.com";
export const shareImage = {
  url: "/images/studacad-share.jpg",
  width: 1200,
  height: 630,
  alt: "Studacad — Botswana tutors and exam preparation",
};

type PublicMetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
};

export function publicMetadata({
  title,
  description,
  path,
  type = "website",
}: PublicMetadataInput): Metadata {
  return {
    metadataBase: new URL(productionOrigin),
    title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      type,
      locale: "en_BW",
      siteName: "Studacad",
      title,
      description,
      url: path,
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage.url],
    },
  };
}

export function privateMetadata(title: string, description: string): Metadata {
  return {
    metadataBase: new URL(productionOrigin),
    title,
    description,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    },
  };
}

export const safeJsonLd = (value: unknown) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");
