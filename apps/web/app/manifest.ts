import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CampusTest Pro",
    short_name: "CampusTest",
    description: "College assessment operations dashboard",
    start_url: "/login",
    display: "standalone",
    background_color: "#f5f7f8",
    theme_color: "#1f7a68",
    icons: [
      {
        src: "/icons/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
