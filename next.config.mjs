const distDir = process.env.NEXT_DIST_DIR?.trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(distDir ? { distDir } : {}),
  // Next 15 dropped the client router cache for dynamic pages from 30 s to 0 s. Keep the Next 14
  // timing so switching between Today / Routines / History within 30 s stays instant, as before
  // the upgrade (FF-PLATFORM-001; every page here is dynamic because it reads the session).
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
