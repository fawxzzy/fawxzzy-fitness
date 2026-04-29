const RECOVERY_TOKEN_KEYS = ["access_token", "refresh_token", "type"] as const;

export function hasRecoveryFragment(hash: string) {
  return RECOVERY_TOKEN_KEYS.some((key) => hash.includes(`${key}=`));
}

export function readRecoveryTokensFromHash(hash: string) {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const searchParams = new URLSearchParams(normalizedHash);
  const accessToken = searchParams.get("access_token")?.trim() ?? "";
  const refreshToken = searchParams.get("refresh_token")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "";

  return {
    accessToken,
    refreshToken,
    type,
  };
}
