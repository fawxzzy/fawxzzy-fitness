import type { NextRequest } from "next/server";

type RequestLike = NextRequest | Request;

function readHeader(request: RequestLike, name: string) {
  return request.headers.get(name)?.trim() ?? "";
}

export function getRequestOrigin(request: RequestLike, fallbackHost = "127.0.0.1:3000") {
  const requestUrl = new URL(request.url);
  const forwardedHost = readHeader(request, "x-forwarded-host");
  const hostHeader = forwardedHost || readHeader(request, "host") || requestUrl.host || fallbackHost;
  const protocol = readHeader(request, "x-forwarded-proto") || requestUrl.protocol.replace(/:$/, "") || "http";
  const safeHost = hostHeader.startsWith("0.0.0.0") ? fallbackHost : hostHeader;
  return `${protocol}://${safeHost}`;
}

export function buildRequestScopedUrl(request: RequestLike, pathname: string, fallbackHost?: string) {
  return new URL(pathname, getRequestOrigin(request, fallbackHost));
}
