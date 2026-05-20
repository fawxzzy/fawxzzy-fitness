import assert from "node:assert/strict";
import test from "node:test";

import { reconcileSpotifyMirrorSnapshot } from "./mirror.ts";
import type { DiscordSpotifyQueueItemRow } from "./queue.ts";

function queueItem(overrides: Partial<DiscordSpotifyQueueItemRow>): DiscordSpotifyQueueItemRow {
  return {
    id: "queue-1",
    lobby_id: "lobby-1",
    status: "approved",
    source_type: "discord_search",
    approval_state: "approved",
    playback_state: "queued",
    spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
    spotify_url: null,
    track_title: "Hey Ya!",
    artist_name: "Outkast",
    album_name: null,
    duration_ms: null,
    suggested_by_discord_user_id: "123456789012345678",
    suggested_by_spotify_user_id: null,
    approved_by_discord_user_id: "123456789012345678",
    rejected_by_discord_user_id: null,
    removed_by_discord_user_id: null,
    rejection_reason: null,
    removal_reason: null,
    queue_position: 1,
    dedupe_key: null,
    mirror_first_seen_at: null,
    mirror_last_seen_at: null,
    display_position: 1,
    cleared_reason: null,
    approved_at: null,
    rejected_at: null,
    removed_at: null,
    played_at: null,
    skipped_at: null,
    playback_started_at: null,
    playback_finished_at: null,
    created_at: "2026-05-20T00:00:00.000Z",
    updated_at: "2026-05-20T00:00:00.000Z",
    ...overrides,
  };
}

test("reconcileSpotifyMirrorSnapshot treats an active Discord search duplicate as coverage only", () => {
  const plan = reconcileSpotifyMirrorSnapshot({
    existingItems: [queueItem({ id: "discord-item" })],
    snapshot: {
      currentlyPlaying: null,
      queue: [{
        spotifyUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
        spotifyUrl: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
        trackTitle: "Hey Ya!",
        artistName: "Outkast",
        albumName: "Speakerboxxx/The Love Below",
        durationMs: 235213,
      }],
    },
  });

  assert.deepEqual(plan.merges, []);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.coveredByDiscordOwned, 1);
});

test("reconcileSpotifyMirrorSnapshot treats an active Discord link duplicate as coverage only", () => {
  const plan = reconcileSpotifyMirrorSnapshot({
    existingItems: [queueItem({ id: "discord-link-item", source_type: "discord_link" })],
    snapshot: {
      currentlyPlaying: null,
      queue: [{
        spotifyUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
        spotifyUrl: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
        trackTitle: "Hey Ya!",
        artistName: "Outkast",
        albumName: "Speakerboxxx/The Love Below",
        durationMs: 235213,
      }],
    },
  });

  assert.deepEqual(plan.merges, []);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.coveredByDiscordOwned, 1);
});

test("reconcileSpotifyMirrorSnapshot consumes Discord-owned coverage once per matching row", () => {
  const duplicateTrack = {
    spotifyUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
    spotifyUrl: null,
    trackTitle: "Hey Ya!",
    artistName: "Outkast",
    albumName: null,
    durationMs: null,
  };
  const plan = reconcileSpotifyMirrorSnapshot({
    existingItems: [queueItem({ id: "discord-item", source_type: "discord_search" })],
    snapshot: {
      currentlyPlaying: null,
      queue: [duplicateTrack, duplicateTrack],
    },
  });

  assert.deepEqual(plan.merges, []);
  assert.equal(plan.inserts.length, 1);
  assert.equal(plan.coveredByDiscordOwned, 1);
});

test("reconcileSpotifyMirrorSnapshot preserves intentional repeats as separate inserts", () => {
  const plan = reconcileSpotifyMirrorSnapshot({
    existingItems: [queueItem({ id: "played-item", playback_state: "played", status: "played" })],
    snapshot: {
      currentlyPlaying: null,
      queue: [{
        spotifyUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
        spotifyUrl: null,
        trackTitle: "Hey Ya!",
        artistName: "Outkast",
        albumName: null,
        durationMs: null,
      }],
    },
  });

  assert.equal(plan.merges.length, 0);
  assert.equal(plan.inserts.length, 1);
});

test("reconcileSpotifyMirrorSnapshot prefers an existing mirror row over Discord-owned coverage", () => {
  const plan = reconcileSpotifyMirrorSnapshot({
    existingItems: [
      queueItem({ id: "discord-item", source_type: "discord_search", display_position: 1 }),
      queueItem({
        id: "mirror-item",
        source_type: "spotify_mirror",
        display_position: 2,
        mirror_first_seen_at: "2026-05-20T00:00:00.000Z",
      }),
    ],
    snapshot: {
      currentlyPlaying: null,
      queue: [{
        spotifyUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
        spotifyUrl: null,
        trackTitle: "Hey Ya!",
        artistName: "Outkast",
        albumName: null,
        durationMs: null,
      }],
    },
  });

  assert.deepEqual(plan.merges, [{ queueItemId: "mirror-item", displayPosition: 1 }]);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.coveredByDiscordOwned, 0);
});

test("reconcileSpotifyMirrorSnapshot dedupes repeated mirror sync rows", () => {
  const plan = reconcileSpotifyMirrorSnapshot({
    existingItems: [queueItem({
      id: "mirrored-item",
      source_type: "spotify_mirror",
      dedupe_key: "lobby-1:spotify_mirror:spotify:track:3n3ppam7vgava1iaruc9lp",
      mirror_first_seen_at: "2026-05-20T00:00:00.000Z",
      mirror_last_seen_at: "2026-05-20T00:00:00.000Z",
    })],
    snapshot: {
      currentlyPlaying: null,
      queue: [{
        spotifyUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
        spotifyUrl: null,
        trackTitle: "Hey Ya!",
        artistName: "Outkast",
        albumName: null,
        durationMs: null,
      }],
    },
  });

  assert.deepEqual(plan.merges, [{ queueItemId: "mirrored-item", displayPosition: 1 }]);
  assert.equal(plan.inserts.length, 0);
});

test("reconcileSpotifyMirrorSnapshot marks matching current playback", () => {
  const plan = reconcileSpotifyMirrorSnapshot({
    existingItems: [queueItem({ id: "current-item" })],
    snapshot: {
      currentlyPlaying: {
        spotifyUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
        spotifyUrl: null,
        trackTitle: "Hey Ya!",
        artistName: "Outkast",
        albumName: null,
        durationMs: null,
      },
      queue: [],
    },
  });

  assert.equal(plan.currentlyPlayingItemId, "current-item");
});
