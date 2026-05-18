import "server-only";

export type SpotifyProduct = "premium" | "free" | "open" | "unknown";

export type SpotifyCurrentUserProfile = {
  id: string;
  display_name: string | null;
  product?: string | null;
};

export type SpotifyProfileSnapshot = {
  spotifyUserId: string;
  spotifyDisplayName: string | null;
  spotifyProduct: SpotifyProduct;
  isPremium: boolean;
};

const SPOTIFY_ME_ENDPOINT = "https://api.spotify.com/v1/me";

export function normalizeSpotifyProduct(product: unknown): SpotifyProduct {
  if (product === "premium") {
    return "premium";
  }

  if (product === "free") {
    return "free";
  }

  if (product === "open") {
    return "open";
  }

  return "unknown";
}

export function isSpotifyPremiumProduct(product: SpotifyProduct): boolean {
  return product === "premium";
}

export function mapSpotifyProfileSnapshot(profile: SpotifyCurrentUserProfile): SpotifyProfileSnapshot {
  const spotifyProduct = normalizeSpotifyProduct(profile.product);

  return {
    spotifyUserId: profile.id,
    spotifyDisplayName: typeof profile.display_name === "string" && profile.display_name.trim().length > 0
      ? profile.display_name.trim()
      : null,
    spotifyProduct,
    isPremium: isSpotifyPremiumProduct(spotifyProduct),
  };
}

export async function fetchSpotifyCurrentUserProfile(accessToken: string): Promise<SpotifyProfileSnapshot> {
  const response = await fetch(SPOTIFY_ME_ENDPOINT, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Spotify profile request failed with status ${response.status}.`);
  }

  const body = await response.json() as Partial<SpotifyCurrentUserProfile>;
  if (typeof body.id !== "string" || body.id.trim().length === 0) {
    throw new Error("Spotify profile response did not include a valid user id.");
  }

  return mapSpotifyProfileSnapshot({
    id: body.id,
    display_name: typeof body.display_name === "string" ? body.display_name : null,
    product: body.product,
  });
}
