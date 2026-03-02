import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FawxzzyFitness",
    short_name: "FawxzzyFitness",
    description: "Track sessions and progress with a focused training workflow.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#0b0f0d",
    background_color: "#0b0f0d",
    icons: [
      {
        src: "/app/icon/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable" as any,
      },
      {
        src: "/app/icon/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable" as any,
      },
    ],
  };
}
