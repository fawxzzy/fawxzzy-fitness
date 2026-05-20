import assert from "node:assert/strict";
import test from "node:test";

import {
  approveDiscordSpotifyQueueItem,
  buildDiscordSpotifyQueuePreviewLines,
  buildDiscordSpotifyQueueSummaryText,
  clearStaleMirroredDiscordSpotifyQueueItems,
  fetchSpotifyTrackMetadata,
  parseSpotifyTrackReference,
  rejectDiscordSpotifyQueueItem,
  removeDiscordSpotifyQueueItem,
  suggestDiscordSpotifyQueueItem,
} from "./queue.ts";

test("parseSpotifyTrackReference accepts Spotify track URLs", () => {
  assert.deepEqual(
    parseSpotifyTrackReference("https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=test"),
    {
      trackId: "3n3Ppam7vgaVa1iaRUc9Lp",
      spotifyUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
      spotifyUrl: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
    },
  );
});

test("parseSpotifyTrackReference accepts spotify:track URIs", () => {
  assert.deepEqual(
    parseSpotifyTrackReference("spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"),
    {
      trackId: "3n3Ppam7vgaVa1iaRUc9Lp",
      spotifyUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
      spotifyUrl: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
    },
  );
});

test("parseSpotifyTrackReference rejects non-track input", () => {
  assert.throws(
    () => parseSpotifyTrackReference("https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6"),
    /Only Spotify track URLs/,
  );
});

test("suggestDiscordSpotifyQueueItem creates a pending queue item in review mode", async () => {
  const observed = {
    insertValues: null as Record<string, unknown> | null,
  };
  const queueItemId = "abcdef12-0000-4000-8000-000000000001";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("metadata fetch should not run without Spotify app credentials");
  };

  const admin = {
    from() {
      return {
        insert(values: Record<string, unknown>) {
          observed.insertValues = values;
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: queueItemId,
                      ...values,
                    },
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    },
  };

  try {
    const row = await suggestDiscordSpotifyQueueItem({
      lobbyId: "lobby-1",
      spotifyUrlOrUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
      suggestedByDiscordUserId: "123456789012345678",
      suggestedBySpotifyUserId: "spotify-user-1",
      approvalMode: "review",
      admin: admin as never,
    });

    assert.equal(observed.insertValues?.status, "pending");
    assert.equal(observed.insertValues?.lobby_id, "lobby-1");
    assert.equal(observed.insertValues?.spotify_uri, "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp");
    assert.equal(row.status, "pending");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("approveDiscordSpotifyQueueItem assigns the next queue position", async () => {
  const observed = {
    updateValues: null as Record<string, unknown> | null,
  };
  const queueItemId = "abcdef12-0000-4000-8000-000000000002";

  const admin = {
    from() {
      return {
        select() {
          return {
            eq(_column: string, value: unknown) {
              if (value === queueItemId) {
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: {
                        id: queueItemId,
                        lobby_id: "lobby-1",
                        status: "pending",
                        spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
                        spotify_url: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
                        track_title: "Hey Ya!",
                        artist_name: "Outkast",
                        album_name: "Speakerboxxx/The Love Below",
                        duration_ms: 235213,
                        suggested_by_discord_user_id: "123456789012345678",
                        suggested_by_spotify_user_id: null,
                        approved_by_discord_user_id: null,
                        rejected_by_discord_user_id: null,
                        removed_by_discord_user_id: null,
                        rejection_reason: null,
                        removal_reason: null,
                        queue_position: null,
                        approved_at: null,
                        rejected_at: null,
                        removed_at: null,
                        played_at: null,
                        skipped_at: null,
                        created_at: "2026-05-19T00:00:00.000Z",
                        updated_at: "2026-05-19T00:00:00.000Z",
                      },
                      error: null,
                    });
                  },
                };
              }

              return {
                order() {
                  return {
                    order() {
                      return Promise.resolve({
                        data: [{
                          id: "queue-existing",
                          lobby_id: "lobby-1",
                          status: "approved",
                          spotify_uri: "spotify:track:1111111111111111111111",
                          spotify_url: null,
                          track_title: null,
                          artist_name: null,
                          album_name: null,
                          duration_ms: null,
                          suggested_by_discord_user_id: "111111111111111111",
                          suggested_by_spotify_user_id: null,
                          approved_by_discord_user_id: "222222222222222222",
                          rejected_by_discord_user_id: null,
                          removed_by_discord_user_id: null,
                          rejection_reason: null,
                          removal_reason: null,
                          queue_position: 2,
                          approved_at: "2026-05-19T00:00:00.000Z",
                          rejected_at: null,
                          removed_at: null,
                          played_at: null,
                          skipped_at: null,
                          created_at: "2026-05-19T00:00:00.000Z",
                          updated_at: "2026-05-19T00:00:00.000Z",
                        }],
                        error: null,
                      });
                    },
                  };
                },
              };
            },
            in() {
              return {
                order() {
                  return {
                    order() {
                      return Promise.resolve({ data: [], error: null });
                    },
                  };
                },
              };
            },
            order() {
              return {
                order() {
                  return Promise.resolve({ data: [], error: null });
                },
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          observed.updateValues = values;
          return {
            eq() {
              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve({
                        data: {
                          id: queueItemId,
                          lobby_id: "lobby-1",
                          status: "approved",
                          spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
                          spotify_url: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
                          track_title: "Hey Ya!",
                          artist_name: "Outkast",
                          album_name: "Speakerboxxx/The Love Below",
                          duration_ms: 235213,
                          suggested_by_discord_user_id: "123456789012345678",
                          suggested_by_spotify_user_id: null,
                          approved_by_discord_user_id: "999999999999999999",
                          rejected_by_discord_user_id: null,
                          removed_by_discord_user_id: null,
                          rejection_reason: null,
                          removal_reason: null,
                          queue_position: values.queue_position,
                          approved_at: values.approved_at,
                          rejected_at: null,
                          removed_at: null,
                          played_at: null,
                          skipped_at: null,
                          created_at: "2026-05-19T00:00:00.000Z",
                          updated_at: String(values.updated_at),
                        },
                        error: null,
                      });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const row = await approveDiscordSpotifyQueueItem({
    queueItemIdOrPrefix: queueItemId,
    lobbyId: "lobby-1",
    approvedByDiscordUserId: "999999999999999999",
    admin: admin as never,
  });

  assert.equal(observed.updateValues?.status, "approved");
  assert.equal(observed.updateValues?.queue_position, 3);
  assert.equal(row.queue_position, 3);
});

test("rejectDiscordSpotifyQueueItem stores the rejection reason", async () => {
  const observed = {
    updateValues: null as Record<string, unknown> | null,
  };
  const queueItemId = "abcdef12-0000-4000-8000-000000000003";

  const admin = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: {
                      id: queueItemId,
                      lobby_id: "lobby-1",
                      status: "pending",
                      spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
                      spotify_url: null,
                      track_title: null,
                      artist_name: null,
                      album_name: null,
                      duration_ms: null,
                      suggested_by_discord_user_id: "123456789012345678",
                      suggested_by_spotify_user_id: null,
                      approved_by_discord_user_id: null,
                      rejected_by_discord_user_id: null,
                      removed_by_discord_user_id: null,
                      rejection_reason: null,
                      removal_reason: null,
                      queue_position: null,
                      approved_at: null,
                      rejected_at: null,
                      removed_at: null,
                      played_at: null,
                      skipped_at: null,
                      created_at: "2026-05-19T00:00:00.000Z",
                      updated_at: "2026-05-19T00:00:00.000Z",
                    },
                    error: null,
                  });
                },
              };
            },
            order() {
              return {
                order() {
                  return Promise.resolve({ data: [], error: null });
                },
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          observed.updateValues = values;
          return {
            eq() {
              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve({
                        data: {
                          id: queueItemId,
                          lobby_id: "lobby-1",
                          status: "rejected",
                          spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
                          spotify_url: null,
                          track_title: null,
                          artist_name: null,
                          album_name: null,
                          duration_ms: null,
                          suggested_by_discord_user_id: "123456789012345678",
                          suggested_by_spotify_user_id: null,
                          approved_by_discord_user_id: null,
                          rejected_by_discord_user_id: "999999999999999999",
                          removed_by_discord_user_id: null,
                          rejection_reason: values.rejection_reason,
                          removal_reason: null,
                          queue_position: null,
                          approved_at: null,
                          rejected_at: values.rejected_at,
                          removed_at: null,
                          played_at: null,
                          skipped_at: null,
                          created_at: "2026-05-19T00:00:00.000Z",
                          updated_at: String(values.updated_at),
                        },
                        error: null,
                      });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const row = await rejectDiscordSpotifyQueueItem({
    queueItemIdOrPrefix: queueItemId,
    lobbyId: "lobby-1",
    rejectedByDiscordUserId: "999999999999999999",
    reason: "Duplicate vibe",
    admin: admin as never,
  });

  assert.equal(observed.updateValues?.rejection_reason, "Duplicate vibe");
  assert.equal(row.rejection_reason, "Duplicate vibe");
});

test("removeDiscordSpotifyQueueItem stores the removal reason", async () => {
  const observed = {
    updateValues: null as Record<string, unknown> | null,
  };
  const queueItemId = "abcdef12-0000-4000-8000-000000000004";

  const admin = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: {
                      id: queueItemId,
                      lobby_id: "lobby-1",
                      status: "approved",
                      spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
                      spotify_url: null,
                      track_title: "Hey Ya!",
                      artist_name: "Outkast",
                      album_name: null,
                      duration_ms: null,
                      suggested_by_discord_user_id: "123456789012345678",
                      suggested_by_spotify_user_id: null,
                      approved_by_discord_user_id: "999999999999999999",
                      rejected_by_discord_user_id: null,
                      removed_by_discord_user_id: null,
                      rejection_reason: null,
                      removal_reason: null,
                      queue_position: 1,
                      approved_at: "2026-05-19T00:00:00.000Z",
                      rejected_at: null,
                      removed_at: null,
                      played_at: null,
                      skipped_at: null,
                      created_at: "2026-05-19T00:00:00.000Z",
                      updated_at: "2026-05-19T00:00:00.000Z",
                    },
                    error: null,
                  });
                },
              };
            },
            order() {
              return {
                order() {
                  return Promise.resolve({ data: [], error: null });
                },
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          observed.updateValues = values;
          return {
            eq() {
              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve({
                        data: {
                          id: queueItemId,
                          lobby_id: "lobby-1",
                          status: "removed",
                          spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
                          spotify_url: null,
                          track_title: "Hey Ya!",
                          artist_name: "Outkast",
                          album_name: null,
                          duration_ms: null,
                          suggested_by_discord_user_id: "123456789012345678",
                          suggested_by_spotify_user_id: null,
                          approved_by_discord_user_id: "999999999999999999",
                          rejected_by_discord_user_id: null,
                          removed_by_discord_user_id: "999999999999999999",
                          rejection_reason: null,
                          removal_reason: values.removal_reason,
                          queue_position: 1,
                          approved_at: "2026-05-19T00:00:00.000Z",
                          rejected_at: null,
                          removed_at: values.removed_at,
                          played_at: null,
                          skipped_at: null,
                          created_at: "2026-05-19T00:00:00.000Z",
                          updated_at: String(values.updated_at),
                        },
                        error: null,
                      });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const row = await removeDiscordSpotifyQueueItem({
    queueItemIdOrPrefix: queueItemId,
    lobbyId: "lobby-1",
    removedByDiscordUserId: "999999999999999999",
    reason: "Host rotated the vibe",
    admin: admin as never,
  });

  assert.equal(observed.updateValues?.removal_reason, "Host rotated the vibe");
  assert.equal(row.removal_reason, "Host rotated the vibe");
});

test("buildDiscordSpotifyQueuePreviewLines shows top approved items only", () => {
  const lines = buildDiscordSpotifyQueuePreviewLines({
    approvedItems: [
      {
        id: "queue-1",
        lobby_id: "lobby-1",
        status: "approved",
        source_type: "discord_link",
        approval_state: "approved",
        playback_state: "queued",
        spotify_uri: "spotify:track:1111111111111111111111",
        spotify_url: null,
        track_title: "Song A",
        artist_name: "Artist A",
        album_name: null,
        duration_ms: null,
        suggested_by_discord_user_id: "1",
        suggested_by_spotify_user_id: null,
        approved_by_discord_user_id: "2",
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
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      },
    ],
    pendingItems: [],
  });

  assert.deepEqual(lines, ["1. Song A - Artist A (Discord link)"]);
});

test("buildDiscordSpotifyQueueSummaryText shows pending count without user ids", () => {
  const summary = buildDiscordSpotifyQueueSummaryText({
    approvedItems: [],
    pendingItems: [
      {
        id: "abcdef12-0000-4000-8000-000000000000",
        lobby_id: "lobby-1",
        status: "pending",
        source_type: "discord_link",
        approval_state: "pending",
        playback_state: "queued",
        spotify_uri: "spotify:track:1111111111111111111111",
        spotify_url: null,
        track_title: "Song A",
        artist_name: "Artist A",
        album_name: null,
        duration_ms: null,
        suggested_by_discord_user_id: "123456789012345678",
        suggested_by_spotify_user_id: null,
        approved_by_discord_user_id: null,
        rejected_by_discord_user_id: null,
        removed_by_discord_user_id: null,
        rejection_reason: null,
        removal_reason: null,
        queue_position: null,
        dedupe_key: null,
        mirror_first_seen_at: null,
        mirror_last_seen_at: null,
        display_position: null,
        cleared_reason: null,
        approved_at: null,
        rejected_at: null,
        removed_at: null,
        played_at: null,
        skipped_at: null,
        playback_started_at: null,
        playback_finished_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      },
    ],
  });

  assert.match(summary, /Pending suggestions: 1/);
  assert.doesNotMatch(summary, /123456789012345678/);
});

test("clearStaleMirroredDiscordSpotifyQueueItems retires only stale mirror-owned rows", async () => {
  const rows = [
    buildQueueTestRow({
      id: "stale-mirror",
      source_type: "spotify_mirror",
      spotify_uri: "spotify:track:1111111111111111111111",
    }),
    buildQueueTestRow({
      id: "fresh-mirror",
      source_type: "spotify_mirror",
      spotify_uri: "spotify:track:2222222222222222222222",
    }),
    buildQueueTestRow({
      id: "discord-search",
      source_type: "discord_search",
      spotify_uri: "spotify:track:3333333333333333333333",
    }),
    buildQueueTestRow({
      id: "discord-link",
      source_type: "discord_link",
      spotify_uri: "spotify:track:4444444444444444444444",
    }),
    buildQueueTestRow({
      id: "old-mirror-history",
      source_type: "spotify_mirror",
      spotify_uri: "spotify:track:5555555555555555555555",
      playback_state: "played",
      status: "played",
    }),
  ];
  const updates: Array<{ id: string; values: Record<string, unknown> }> = [];
  const admin = {
    from() {
      return {
        select() {
          const query = {
            eq() {
              return query;
            },
            order() {
              return query;
            },
            in() {
              return query;
            },
            then(resolve: (value: { data: typeof rows; error: null }) => void) {
              resolve({ data: rows, error: null });
            },
          };
          return query;
        },
        update(values: Record<string, unknown>) {
          return {
            eq(_column: string, id: string) {
              updates.push({ id, values });
              const row = rows.find((item) => item.id === id);
              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve({
                        data: {
                          ...row,
                          ...values,
                        },
                        error: null,
                      });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const retiredCount = await clearStaleMirroredDiscordSpotifyQueueItems({
    lobbyId: "lobby-1",
    activeSpotifyUris: ["spotify:track:2222222222222222222222"],
    admin: admin as never,
  });

  assert.equal(retiredCount, 1);
  assert.deepEqual(updates.map((update) => update.id), ["stale-mirror"]);
  assert.equal(updates[0]?.values.status, "skipped");
  assert.equal(updates[0]?.values.playback_state, "cleared");
  assert.equal(updates[0]?.values.cleared_reason, "mirror_missing_from_latest_snapshot");
});

test("fetchSpotifyTrackMetadata never calls Spotify player APIs", async () => {
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_CLIENT_SECRET = "spotify-client-secret";
  const observedUrls: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    observedUrls.push(url);
    if (url === "https://accounts.spotify.com/api/token") {
      return new Response(JSON.stringify({ access_token: "app-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url === "https://api.spotify.com/v1/tracks/3n3Ppam7vgaVa1iaRUc9Lp") {
      return new Response(JSON.stringify({
        name: "Hey Ya!",
        duration_ms: 235213,
        album: { name: "Speakerboxxx/The Love Below" },
        artists: [{ name: "Outkast" }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const metadata = await fetchSpotifyTrackMetadata("3n3Ppam7vgaVa1iaRUc9Lp");
    assert.equal(metadata?.trackTitle, "Hey Ya!");
    assert.equal(observedUrls.some((url) => url.includes("/me/player")), false);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
  }
});

function buildQueueTestRow(overrides: Record<string, unknown>) {
  return {
    id: "queue-1",
    lobby_id: "lobby-1",
    status: "approved",
    source_type: "discord_link",
    approval_state: "approved",
    playback_state: "queued",
    spotify_uri: "spotify:track:1111111111111111111111",
    spotify_url: null,
    track_title: "Song A",
    artist_name: "Artist A",
    album_name: null,
    duration_ms: null,
    suggested_by_discord_user_id: "123456789012345678",
    suggested_by_spotify_user_id: null,
    approved_by_discord_user_id: "999999999999999999",
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
    created_at: "2026-05-19T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
