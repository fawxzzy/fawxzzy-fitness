const INSTALL_GATE_PUBLIC_PATHS = new Set([
  "/install",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
]);

export function isInstallGatePublicPath(pathname: string) {
  return INSTALL_GATE_PUBLIC_PATHS.has(pathname) || pathname === "/auth" || pathname.startsWith("/auth/");
}
