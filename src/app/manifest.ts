import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nivesh Saathi",
    short_name: "Nivesh Saathi",
    description:
      "Secure FD advisor with compare, shortlist, and unified text-plus-voice guidance.",
    start_url: "/",
    display: "standalone",
    background_color: "#07110f",
    theme_color: "#07110f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
