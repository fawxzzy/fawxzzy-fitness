import type { Metadata, Viewport } from "next";
import { ServiceWorkerBootstrap } from "@/components/ServiceWorkerBootstrap";
import { GlassEffectsBootstrap } from "@/components/ui/GlassEffectsBootstrap";
import { DisplayModeBootstrap } from "@/components/ui/app/DisplayModeBootstrap";
import { PersistentAppChrome } from "@/components/ui/app/PersistentAppChrome";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { MobileViewportGuard } from "@/components/ui/MobileViewportGuard";
import "./globals.css";

export const metadata: Metadata = {
  title: "FawxzzyFitness",
  description: "Foundation app for logging gym sessions.",
  appleWebApp: {
    capable: true,
    title: "FawxzzyFitness",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/app/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/app/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/app/icon-512.png", sizes: "512x512", type: "image/png" }],
    shortcut: [{ url: "/app/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "FawxzzyFitness",
  },
};

export const viewport: Viewport = {
  themeColor: "#07111b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="relative overflow-x-hidden">
        <PersistentAppChrome />
        <ToastProvider>
          <ServiceWorkerBootstrap />
          <GlassEffectsBootstrap />
          <DisplayModeBootstrap />
          <MobileViewportGuard />
          <main className="safe-area-main relative z-10 flex min-h-[100dvh] w-full flex-col overflow-hidden">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
