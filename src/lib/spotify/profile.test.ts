import assert from "node:assert/strict";
import test from "node:test";
import {
  isSpotifyPremiumProduct,
  mapSpotifyProfileSnapshot,
  normalizeSpotifyProduct,
} from "./profile.ts";

test("Spotify product premium maps to Jam Ready eligibility", () => {
  const snapshot = mapSpotifyProfileSnapshot({
    id: "spotify-user",
    display_name: "Fawxzzy",
    product: "premium",
  });

  assert.equal(snapshot.spotifyProduct, "premium");
  assert.equal(snapshot.isPremium, true);
  assert.equal(isSpotifyPremiumProduct(snapshot.spotifyProduct), true);
});

test("Spotify free, open, and unknown products are not Jam Ready", () => {
  assert.equal(normalizeSpotifyProduct("free"), "free");
  assert.equal(normalizeSpotifyProduct("open"), "open");
  assert.equal(normalizeSpotifyProduct(undefined), "unknown");
  assert.equal(isSpotifyPremiumProduct("free"), false);
  assert.equal(isSpotifyPremiumProduct("open"), false);
  assert.equal(isSpotifyPremiumProduct("unknown"), false);
});
