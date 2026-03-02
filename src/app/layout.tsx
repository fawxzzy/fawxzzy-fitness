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
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
          <main className="safe-area-main relative z-10 mx-auto min-h-screen w-full max-w-md px-4 pb-6">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
