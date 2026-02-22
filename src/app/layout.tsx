import type { Metadata, Viewport } from "next";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { GlassEffectsBootstrap } from "@/components/ui/GlassEffectsBootstrap";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minimalist Gym Progression Engine",
  description: "Foundation app for logging gym sessions.",
  appleWebApp: {
    capable: true,
    title: "Fawxzzy Fitness",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Fawxzzy Fitness",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
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
          <AnimatedBackground />
          <main className="relative z-10 mx-auto min-h-screen w-full max-w-md px-4 py-6">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
