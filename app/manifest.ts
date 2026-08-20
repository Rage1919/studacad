import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Studacad",
    short_name: "Studacad",
    description:
      "Botswana tutors and exam preparation for PSLE, JCE, and BGCSE.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf0",
    theme_color: "#171717",
    lang: "en-BW",
  };
}
