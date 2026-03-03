import type { Metadata, Viewport } from "next";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { GlassEffectsBootstrap } from "@/components/ui/GlassEffectsBootstrap";
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
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "FawxzzyFitness",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
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
        <ToastProvider>
          <GlassEffectsBootstrap />
          <MobileViewportGuard />
          <AnimatedBackground />
          <main className="safe-area-main relative z-10 mx-auto min-h-screen w-full max-w-md px-4 pb-[var(--app-bottom-gap)]">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
