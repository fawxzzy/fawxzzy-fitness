import assert from "node:assert/strict";
import test from "node:test";

import {
  approveDiscordSpotifyQueueItem,
  buildDiscordSpotifyQueuePreviewLines,
  buildDiscordSpotifyQueueSummaryText,
  clearStaleMirroredDiscordSpotifyQueueItems,
  fetchSpotifyTrackMetadata,
  getDiscordSpotifyQueueSummary,
  planInactiveDiscordSpotifyQueueItemsForPlaybackSnapshot,
  parseSpotifyTrackReference,
  rejectDiscordSpotifyQueueItem,
  removeDiscordSpotifyQueueItem,
  suggestDiscordSpotifyQueueItem,
  type DiscordSpotifyQueueItemRow,
} from "./queue.ts";

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

test("planInactiveDiscordSpotifyQueueItemsForPlaybackSnapshot retires played and skipped rows missing from Spotify", () => {
  const inactive = planInactiveDiscordSpotifyQueueItemsForPlaybackSnapshot({
    activeSpotifyUris: ["spotify:track:1111111111111111111111"],
    activeItems: [
      queueItem({
        id: "playing-missing",
        playback_state: "playing",
        spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
      }),
      queueItem({
        id: "queued-present",
        spotify_uri: "spotify:track:1111111111111111111111",
        display_position: 2,
      }),
      queueItem({
        id: "queued-missing",
        spotify_uri: "spotify:track:2222222222222222222222",
        display_position: 3,
      }),
    ],
  });

  assert.deepEqual(inactive.map((item) => item.id), ["playing-missing", "queued-missing"]);
});

test("planInactiveDiscordSpotifyQueueItemsForPlaybackSnapshot is count-aware for repeated tracks", () => {
  const inactive = planInactiveDiscordSpotifyQueueItemsForPlaybackSnapshot({
    activeSpotifyUris: ["spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"],
    activeItems: [
      queueItem({ id: "repeat-1", display_position: 1 }),
      queueItem({ id: "repeat-2", display_position: 2 }),
    ],
  });

  assert.deepEqual(inactive.map((item) => item.id), ["repeat-2"]);
});

test("planInactiveDiscordSpotifyQueueItemsForPlaybackSnapshot ignores history rows", () => {
  const inactive = planInactiveDiscordSpotifyQueueItemsForPlaybackSnapshot({
    activeSpotifyUris: [],
    activeItems: [
      queueItem({ id: "played", status: "played", playback_state: "played" }),
      queueItem({ id: "skipped", status: "skipped", playback_state: "skipped" }),
    ],
  });

  assert.deepEqual(inactive, []);
});

test("planInactiveDiscordSpotifyQueueItemsForPlaybackSnapshot ignores Spotify Up Next mirror rows", () => {
  const inactive = planInactiveDiscordSpotifyQueueItemsForPlaybackSnapshot({
    activeSpotifyUris: [],
    activeItems: [
      queueItem({ id: "room-queue", source_type: "discord_search" }),
      queueItem({ id: "spotify-up-next", source_type: "spotify_mirror" }),
    ],
  });

  assert.deepEqual(inactive.map((item) => item.id), ["room-queue"]);
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
  const item = queueItem({
    id: "queue-1",
    source_type: "discord_link",
    spotify_uri: "spotify:track:1111111111111111111111",
    track_title: "Song A",
    artist_name: "Artist A",
  });
  const lines = buildDiscordSpotifyQueuePreviewLines({
    roomQueueItems: [item],
    spotifyUpNextItems: [],
    approvedItems: [item],
    pendingItems: [],
    recentItems: [],
  });

  assert.deepEqual(lines, ["1. Song A - Artist A (Discord link)"]);
});

test("buildDiscordSpotifyQueueSummaryText shows pending count without user ids", () => {
  const pendingItem = queueItem({
    id: "abcdef12-0000-4000-8000-000000000000",
    status: "pending",
    source_type: "discord_link",
    approval_state: "pending",
    spotify_uri: "spotify:track:1111111111111111111111",
    track_title: "Song A",
    artist_name: "Artist A",
    suggested_by_discord_user_id: "123456789012345678",
    approved_by_discord_user_id: null,
    queue_position: null,
    display_position: null,
  });
  const summary = buildDiscordSpotifyQueueSummaryText({
    roomQueueItems: [],
    spotifyUpNextItems: [],
    approvedItems: [],
    pendingItems: [pendingItem],
    recentItems: [],
  });

  assert.match(summary, /Pending suggestions: 1/);
  assert.doesNotMatch(summary, /123456789012345678/);
});

test("buildDiscordSpotifyQueueSummaryText separates Current from upcoming Room Queue", () => {
  const currentItem = queueItem({
    id: "current-track",
    playback_state: "playing",
    spotify_uri: "spotify:track:1111111111111111111111",
    track_title: "Current Song",
    artist_name: "Current Artist",
    queue_position: 1,
    display_position: 1,
  });
  const nextItem = queueItem({
    id: "next-track",
    playback_state: "queued",
    spotify_uri: "spotify:track:2222222222222222222222",
    track_title: "Next Song",
    artist_name: "Next Artist",
    queue_position: 2,
    display_position: 2,
  });

  const summary = buildDiscordSpotifyQueueSummaryText({
    roomQueueItems: [currentItem, nextItem],
    spotifyUpNextItems: [],
    approvedItems: [currentItem, nextItem],
    pendingItems: [],
    recentItems: [],
  });

  assert.match(summary, /Current: Current Song - Current Artist/);
  assert.match(summary, /Next: Next Song - Next Artist/);
  assert.match(summary, /2\. Next Song - Next Artist \(Discord search, Queued\)/);
  assert.doesNotMatch(summary, /1\. Current Song - Current Artist \(Discord search, Current\)/);
});

test("getDiscordSpotifyQueueSummary separates Room Queue from Spotify Up Next and Recent", async () => {
  const rows = [
    buildQueueTestRow({
      id: "room-discord-search",
      source_type: "discord_search",
      spotify_uri: "spotify:track:1111111111111111111111",
      display_position: 5,
      queue_position: 5,
    }),
    buildQueueTestRow({
      id: "room-discord-link",
      source_type: "discord_link",
      spotify_uri: "spotify:track:2222222222222222222222",
      display_position: 6,
      queue_position: 6,
    }),
    buildQueueTestRow({
      id: "spotify-up-next",
      source_type: "spotify_mirror",
      spotify_uri: "spotify:track:3333333333333333333333",
      display_position: 1,
      queue_position: 1,
    }),
    buildQueueTestRow({
      id: "recent-played",
      source_type: "discord_search",
      status: "played",
      playback_state: "played",
      spotify_uri: "spotify:track:4444444444444444444444",
      playback_finished_at: "2026-05-20T00:05:00.000Z",
    }),
  ];
  const admin = buildSelectOnlyQueueAdmin(rows);

  const summary = await getDiscordSpotifyQueueSummary({
    lobbyId: "lobby-1",
    admin: admin as never,
  });

  assert.deepEqual(summary.roomQueueItems.map((item) => item.id), ["room-discord-search", "room-discord-link"]);
  assert.deepEqual(summary.approvedItems.map((item) => item.id), ["room-discord-search", "room-discord-link"]);
  assert.deepEqual(summary.spotifyUpNextItems.map((item) => item.id), ["spotify-up-next"]);
  assert.deepEqual(summary.recentItems.map((item) => item.id), ["recent-played"]);
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
  const { retiredCount, updates } = await runClearStaleMirrorTest(rows, [
    "spotify:track:2222222222222222222222",
  ]);

  assert.equal(retiredCount, 1);
  assert.deepEqual(updates.map((update) => update.id), ["stale-mirror"]);
  assert.equal(updates[0]?.values.status, "skipped");
  assert.equal(updates[0]?.values.playback_state, "cleared");
  assert.equal(updates[0]?.values.cleared_reason, "mirror_missing_from_latest_snapshot");
});

test("clearStaleMirroredDiscordSpotifyQueueItems retires extra mirror duplicates by URI count", async () => {
  const duplicateUri = "spotify:track:1111111111111111111111";
  const rows = [
    buildQueueTestRow({
      id: "mirror-first",
      source_type: "spotify_mirror",
      spotify_uri: duplicateUri,
      display_position: 1,
      queue_position: 1,
      created_at: "2026-05-19T00:00:00.000Z",
    }),
    buildQueueTestRow({
      id: "mirror-second",
      source_type: "spotify_mirror",
      spotify_uri: duplicateUri,
      display_position: 2,
      queue_position: 2,
      created_at: "2026-05-19T00:01:00.000Z",
    }),
  ];
  const { retiredCount, updates } = await runClearStaleMirrorTest(rows, [duplicateUri]);

  assert.equal(retiredCount, 1);
  assert.deepEqual(updates.map((update) => update.id), ["mirror-second"]);
  assert.equal(updates[0]?.values.status, "skipped");
  assert.equal(updates[0]?.values.playback_state, "cleared");
});

test("clearStaleMirroredDiscordSpotifyQueueItems keeps mirror duplicates when URI counts match", async () => {
  const duplicateUri = "spotify:track:1111111111111111111111";
  const rows = [
    buildQueueTestRow({
      id: "mirror-first",
      source_type: "spotify_mirror",
      spotify_uri: duplicateUri,
      display_position: 1,
      queue_position: 1,
    }),
    buildQueueTestRow({
      id: "mirror-second",
      source_type: "spotify_mirror",
      spotify_uri: duplicateUri,
      display_position: 2,
      queue_position: 2,
    }),
  ];
  const { retiredCount, updates } = await runClearStaleMirrorTest(rows, [duplicateUri, duplicateUri]);

  assert.equal(retiredCount, 0);
  assert.deepEqual(updates, []);
});

test("clearStaleMirroredDiscordSpotifyQueueItems counts only mirror-owned rows for duplicate clearing", async () => {
  const duplicateUri = "spotify:track:1111111111111111111111";
  const rows = [
    buildQueueTestRow({
      id: "discord-search",
      source_type: "discord_search",
      spotify_uri: duplicateUri,
      display_position: 1,
      queue_position: 1,
    }),
    buildQueueTestRow({
      id: "mirror-row",
      source_type: "spotify_mirror",
      spotify_uri: duplicateUri,
      display_position: 2,
      queue_position: 2,
    }),
  ];
  const { retiredCount, updates } = await runClearStaleMirrorTest(rows, [duplicateUri]);

  assert.equal(retiredCount, 0);
  assert.deepEqual(updates, []);
});

test("clearStaleMirroredDiscordSpotifyQueueItems clears all active mirror rows for absent URIs", async () => {
  const rows = [
    buildQueueTestRow({
      id: "mirror-first",
      source_type: "spotify_mirror",
      spotify_uri: "spotify:track:1111111111111111111111",
      display_position: 1,
      queue_position: 1,
    }),
    buildQueueTestRow({
      id: "mirror-second",
      source_type: "spotify_mirror",
      spotify_uri: "spotify:track:1111111111111111111111",
      display_position: 2,
      queue_position: 2,
    }),
    buildQueueTestRow({
      id: "discord-link",
      source_type: "discord_link",
      spotify_uri: "spotify:track:1111111111111111111111",
      display_position: 3,
      queue_position: 3,
    }),
  ];
  const { retiredCount, updates } = await runClearStaleMirrorTest(rows, []);

  assert.equal(retiredCount, 2);
  assert.deepEqual(updates.map((update) => update.id), ["mirror-first", "mirror-second"]);
  assert.equal(updates.every((update) => update.values.cleared_reason === "mirror_missing_from_latest_snapshot"), true);
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

function buildSelectOnlyQueueAdmin(rows: Array<ReturnType<typeof buildQueueTestRow>>) {
  return {
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
      };
    },
  };
}

async function runClearStaleMirrorTest(
  rows: Array<ReturnType<typeof buildQueueTestRow>>,
  activeSpotifyUris: string[],
) {
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
    activeSpotifyUris,
    admin: admin as never,
  });

  return { retiredCount, updates };
}
