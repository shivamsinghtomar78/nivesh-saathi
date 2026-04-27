import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nivesh Saathi",
    short_name: "Nivesh Saathi",
    description:
      "Voice-first FD advisor with compare, shortlist, and plain-language guidance.",
    start_url: "/",
    display: "standalone",
    background_color: "#08121c",
    theme_color: "#08121c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
