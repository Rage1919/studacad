import type { MetadataRoute } from "next";
import { productionOrigin } from "./lib/seo";

const privatePaths = [
  "/account",
  "/admin",
  "/api",
  "/auth",
  "/become-a-tutor/profile",
  "/bookings",
  "/contact",
  "/favourites",
  "/learn",
  "/lesson",
  "/login",
  "/messages",
  "/notifications",
  "/referral",
  "/tutor$",
  "/tutor/",
  "/wallet",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privatePaths,
    },
    sitemap: `${productionOrigin}/sitemap.xml`,
    host: productionOrigin,
  };
}
