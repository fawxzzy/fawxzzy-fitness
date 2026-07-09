import type { MetadataRoute } from "next";

const APP_ICON_VERSION = "fitness-fox-20260626";

function versionedAppIcon(pathname: string) {
  return `${pathname}?v=${APP_ICON_VERSION}`;
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FawxzzyFitness",
    short_name: "FawxzzyFitness",
    description: "Track sessions and progress with a focused training workflow.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#07111b",
    background_color: "#07111b",
    icons: [
      {
        src: versionedAppIcon("/app/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable" as any,
      },
      {
        src: versionedAppIcon("/app/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable" as any,
      },
    ],
    screenshots: [
      {
        src: "/app/previews/today.png",
        sizes: "430x932",
        type: "image/png",
      },
      {
        src: "/app/previews/session.png",
        sizes: "430x932",
        type: "image/png",
      },
      {
        src: "/app/previews/routines.png",
        sizes: "430x932",
        type: "image/png",
      },
      {
        src: "/app/previews/routine-list.png",
        sizes: "430x932",
        type: "image/png",
      },
      {
        src: "/app/previews/view-day.png",
        sizes: "430x932",
        type: "image/png",
      },
      {
        src: "/app/previews/edit-day.png",
        sizes: "430x932",
        type: "image/png",
      },
      {
        src: "/app/previews/history.png",
        sizes: "430x932",
        type: "image/png",
      },
      {
        src: "/app/previews/add-exercise.png",
        sizes: "430x932",
        type: "image/png",
      },
      {
        src: "/app/previews/history-detail.png",
        sizes: "430x932",
        type: "image/png",
      },
      {
        src: "/app/previews/exercise-detail.png",
        sizes: "430x932",
        type: "image/png",
      },
    ],
  };
}
