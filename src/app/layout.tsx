import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { ServiceWorkerBootstrap } from "@/components/ServiceWorkerBootstrap";
import { ProtectedAppInstallGate } from "@/components/install/ProtectedAppInstallGate";
import { AppAmbientThemeBootstrap } from "@/components/ui/AppAmbientThemeBootstrap";
import { AppThemeBootstrap } from "@/components/ui/AppThemeBootstrap";
import { GlassEffectsBootstrap } from "@/components/ui/GlassEffectsBootstrap";
import { DisplayModeBootstrap } from "@/components/ui/app/DisplayModeBootstrap";
import { PersistentAppChrome } from "@/components/ui/app/PersistentAppChrome";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { MobileViewportGuard } from "@/components/ui/MobileViewportGuard";
import "./globals.css";

const APP_NAME = "FawxzzyFitness";
const APP_DESCRIPTION = "Track sessions and progress with a focused training workflow.";
const APP_PREVIEW_IMAGE = "/app/previews/today.png";
const DEFAULT_APP_SHELL_COLOR = "#07111b";
// iOS home-screen PWAs misplace bottom-anchored UI when black-translucent is
// combined with viewport-fit=cover, so keep the status bar in default mode.
const IOS_STANDALONE_STATUS_BAR_STYLE = "default" as const;

function resolveAppShellColor() {
  const rawColor = process.env.FITNESS_ICON_BG?.trim();
  if (!rawColor) {
    return DEFAULT_APP_SHELL_COLOR;
  }

  const normalized = rawColor.replace(/^#/, "");
  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return DEFAULT_APP_SHELL_COLOR;
  }

  return `#${normalized.toLowerCase()}`;
}

const APP_SHELL_COLOR = resolveAppShellColor();

function resolveMetadataBase() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    "https://fawxzzy-fitness-local.vercel.app",
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return new URL(candidate);
    } catch {
      continue;
    }
  }

  return undefined;
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: IOS_STANDALONE_STATUS_BAR_STYLE,
  },
  openGraph: {
    type: "website",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [
      {
        url: APP_PREVIEW_IMAGE,
        width: 430,
        height: 932,
        alt: "FawxzzyFitness Today screen preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [APP_PREVIEW_IMAGE],
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
    "apple-mobile-web-app-status-bar-style": IOS_STANDALONE_STATUS_BAR_STYLE,
    "apple-mobile-web-app-title": APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: APP_SHELL_COLOR,
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
          <AppAmbientThemeBootstrap />
          <AppThemeBootstrap />
          <GlassEffectsBootstrap />
          <DisplayModeBootstrap />
          <MobileViewportGuard />
          <main className="safe-area-main relative z-10 flex min-h-0 flex-1 w-full flex-col overflow-hidden">
            <Suspense fallback={children}>
              <ProtectedAppInstallGate>{children}</ProtectedAppInstallGate>
            </Suspense>
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
