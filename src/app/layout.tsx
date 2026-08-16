import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
import { ActionFeedbackToasts } from "@/components/ActionFeedbackToasts";
import { ClientBundleRecoveryBootstrap } from "@/components/ClientBundleRecoveryBootstrap";
import { ServiceWorkerBootstrap } from "@/components/ServiceWorkerBootstrap";
import { ProtectedAppInstallGate } from "@/components/install/ProtectedAppInstallGate";
import { AppAmbientThemeBootstrap } from "@/components/ui/AppAmbientThemeBootstrap";
import { AppThemeBootstrap } from "@/components/ui/AppThemeBootstrap";
import { GlassEffectsBootstrap } from "@/components/ui/GlassEffectsBootstrap";
import { DisplayModeBootstrap } from "@/components/ui/app/DisplayModeBootstrap";
import { PersistentAppChrome } from "@/components/ui/app/PersistentAppChrome";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { MobileViewportGuard } from "@/components/ui/MobileViewportGuard";
import { DevSupabaseTargetBanner } from "@/components/dev/DevSupabaseTargetBanner";
import { buildLocalDevBrowserResetScript, buildPreHydrationAppBootPrimerScript } from "@/lib/app-boot-primer";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { APP_BOOT_PREFERENCES_COOKIE_KEY, readAppBootPreferencesCookieValue } from "@/lib/app-boot-preferences";
import { getAppThemeCssVariables, getAppThemeSignature } from "@/lib/app-theme";
import { resolveCanonicalAppOrigin } from "@/lib/app-origin";
import "./globals.css";

const APP_NAME = "FawxzzyFitness";
const APP_DESCRIPTION = "Track sessions and progress with a focused training workflow.";
const APP_PREVIEW_IMAGE = "/brand/fitness-app-icon.png";
const APP_ICON_VERSION = "fitness-fox-20260626";
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

function versionedAppIcon(pathname: string) {
  return `${pathname}?v=${APP_ICON_VERSION}`;
}

function resolveMetadataBase() {
  return new URL(resolveCanonicalAppOrigin());
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
        width: 1280,
        height: 1280,
        alt: "FawxzzyFitness neon fox dumbbell app icon",
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
      { url: versionedAppIcon("/favicon.ico"), rel: "icon" },
      { url: versionedAppIcon("/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { url: versionedAppIcon("/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
      { url: versionedAppIcon("/app/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: versionedAppIcon("/app/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: versionedAppIcon("/icons/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: versionedAppIcon("/icons/icon-192.png"), sizes: "192x192", type: "image/png" }],
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
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const bootPreferences = readAppBootPreferencesCookieValue(cookieStore.get(APP_BOOT_PREFERENCES_COOKIE_KEY)?.value ?? null);
  const bootTheme = bootPreferences?.theme ?? null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-ambient-theme={bootPreferences?.ambientTheme ?? undefined}
      data-display-mode={bootPreferences?.displayMode ?? undefined}
      data-app-theme-ready={bootTheme ? "true" : undefined}
      data-app-theme-signature={bootTheme ? getAppThemeSignature(bootTheme) : undefined}
      style={bootTheme ? getAppThemeCssVariables(bootTheme) as React.CSSProperties : undefined}
    >
      <head>
        <Script id="local-dev-browser-reset" strategy="beforeInteractive">
          {buildLocalDevBrowserResetScript(CURRENT_APP_BUILD_ID)}
        </Script>
        <Script id="app-theme-primer" strategy="beforeInteractive">
          {buildPreHydrationAppBootPrimerScript()}
        </Script>
      </head>
      <body className="relative overflow-x-hidden">
        <DevSupabaseTargetBanner />
        <AppThemeBootstrap />
        <PersistentAppChrome />
        <ToastProvider>
          <Suspense fallback={null}>
            <ActionFeedbackToasts />
          </Suspense>
          <ServiceWorkerBootstrap />
          <ClientBundleRecoveryBootstrap />
          <AppAmbientThemeBootstrap />
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
