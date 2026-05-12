export function isTrustedLocalDevHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if (normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1") {
    return true;
  }

  if (normalized.startsWith("10.")) {
    return true;
  }

  if (normalized.startsWith("192.168.")) {
    return true;
  }

  const octets = normalized.split(".");
  if (octets.length === 4 && octets[0] === "172") {
    const secondOctet = Number(octets[1]);
    return Number.isInteger(secondOctet) && secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}
