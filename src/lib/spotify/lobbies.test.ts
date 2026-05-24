import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDiscordSpotifyLobbyStatusSummary,
  closeDiscordSpotifyLobby,
  formatDiscordSpotifyLobbyStatusLabel,
  openDiscordSpotifyLobby,
  upsertDiscordSpotifyLobbyPanel,
} from "./lobbies.ts";

test("Spotify lobby status helpers describe closed and open states", () => {
  assert.equal(formatDiscordSpotifyLobbyStatusLabel(null), "Closed");
  assert.equal(buildDiscordSpotifyLobbyStatusSummary(null), "Music Sesh lobby is Closed.");

  assert.equal(formatDiscordSpotifyLobbyStatusLabel({
    id: "lobby-1",
    room_slug: "main",
    room_name: "Main Room",
    visibility: "public",
    join_key_hash: null,
    status: "open",
    host_discord_user_id: "123456789012345678",
    host_spotify_user_id: "spotify-user",
    approval_mode: "auto_approve_jam_ready",
    spotify_mirror_enabled: false,
    spotify_mirror_last_synced_at: null,
    spotify_mirror_error_count: 0,
    stop_playback_on_close: true,
    title: null,
    description: null,
    panel_channel_id: null,
    panel_message_id: null,
    opened_at: "2026-05-18T00:00:00.000Z",
    closed_at: null,
    created_at: "2026-05-18T00:00:00.000Z",
    updated_at: "2026-05-18T00:00:00.000Z",
  }), "Open");
  assert.equal(
    buildDiscordSpotifyLobbyStatusSummary({
      id: "lobby-1",
      room_slug: "main",
      room_name: "Main Room",
      visibility: "public",
      join_key_hash: null,
      status: "open",
      host_discord_user_id: "123456789012345678",
      host_spotify_user_id: "spotify-user",
      approval_mode: "auto_approve_jam_ready",
      spotify_mirror_enabled: false,
      spotify_mirror_last_synced_at: null,
      spotify_mirror_error_count: 0,
      stop_playback_on_close: true,
      title: null,
      description: null,
      panel_channel_id: null,
      panel_message_id: null,
      opened_at: "2026-05-18T00:00:00.000Z",
      closed_at: null,
      created_at: "2026-05-18T00:00:00.000Z",
      updated_at: "2026-05-18T00:00:00.000Z",
    }),
    "Music Sesh lobby is Open.\nHost: <@123456789012345678>",
  );
});

test("openDiscordSpotifyLobby creates a fresh open row when the latest lobby is closed", async () => {
  const observed = {
    insertValues: null as Record<string, unknown> | null,
  };

  const admin = {
    from() {
      return {
        select() {
          return {
            order() {
              return {
                limit() {
                  return Promise.resolve({
                    data: [{
                      id: "lobby-1",
                      room_slug: "main",
                      room_name: "Main Room",
                      visibility: "public",
                      join_key_hash: null,
                      status: "closed",
                      host_discord_user_id: null,
                      host_spotify_user_id: null,
                      title: null,
                      description: null,
                      panel_channel_id: "1504668396338413670",
                      panel_message_id: "1504668396338413671",
                      opened_at: null,
                      closed_at: "2026-05-18T00:00:00.000Z",
                      created_at: "2026-05-18T00:00:00.000Z",
                      updated_at: "2026-05-18T00:00:00.000Z",
                    }],
                    error: null,
                  });
                },
              };
            },
          };
        },
        insert(values: Record<string, unknown>) {
          observed.insertValues = values;
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: "lobby-2",
                      ...values,
                      created_at: "2026-05-19T00:00:00.000Z",
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

  const row = await openDiscordSpotifyLobby({
    hostDiscordUserId: "123456789012345678",
    hostSpotifyUserId: "spotify-user",
    admin: admin as never,
  });

  assert.equal(observed.insertValues?.status, "open");
  assert.equal(observed.insertValues?.room_slug, "main");
  assert.equal(observed.insertValues?.room_name, "Main Room");
  assert.equal(observed.insertValues?.visibility, "public");
  assert.equal(observed.insertValues?.host_discord_user_id, "123456789012345678");
  assert.equal(observed.insertValues?.host_spotify_user_id, "spotify-user");
  assert.equal(observed.insertValues?.panel_channel_id, "1504668396338413670");
  assert.equal(observed.insertValues?.panel_message_id, "1504668396338413671");
  assert.equal(row.id, "lobby-2");
  assert.equal(row.status, "open");
});

test("openDiscordSpotifyLobby can default live mirror on for an authorized host", async () => {
  const observed = {
    insertValues: null as Record<string, unknown> | null,
  };

  const admin = {
    from() {
      return {
        select() {
          return {
            order() {
              return {
                limit() {
                  return Promise.resolve({ data: [], error: null });
                },
              };
            },
          };
        },
        insert(values: Record<string, unknown>) {
          observed.insertValues = values;
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: "lobby-mirror",
                      ...values,
                      created_at: "2026-05-20T00:00:00.000Z",
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

  const row = await openDiscordSpotifyLobby({
    hostDiscordUserId: "123456789012345678",
    spotifyMirrorEnabled: true,
    admin: admin as never,
  });

  assert.equal(observed.insertValues?.spotify_mirror_enabled, true);
  assert.equal(row.spotify_mirror_enabled, true);
});

test("closeDiscordSpotifyLobby closes the latest row and preserves panel linkage", async () => {
  const observed = {
    updateValues: null as Record<string, unknown> | null,
  };

  const admin = {
    from() {
      return {
        select() {
          return {
            order() {
              return {
                limit() {
                  return Promise.resolve({
                    data: [{
                      id: "lobby-1",
                      room_slug: "main",
                      room_name: "Main Room",
                      visibility: "public",
                      join_key_hash: null,
                      status: "open",
                      host_discord_user_id: "123456789012345678",
                      host_spotify_user_id: "spotify-user",
                      title: null,
                      description: null,
                      panel_channel_id: "1504668396338413670",
                      panel_message_id: "1504668396338413671",
                      opened_at: "2026-05-18T00:00:00.000Z",
                      closed_at: null,
                      created_at: "2026-05-18T00:00:00.000Z",
                      updated_at: "2026-05-18T00:00:00.000Z",
                    }],
                    error: null,
                  });
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
                          id: "lobby-1",
                          ...values,
                          created_at: "2026-05-18T00:00:00.000Z",
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

  const row = await closeDiscordSpotifyLobby(admin as never);

  assert.equal(observed.updateValues?.status, "closed");
  assert.equal(observed.updateValues?.room_slug, "main");
  assert.equal(observed.updateValues?.room_name, "Main Room");
  assert.equal(observed.updateValues?.panel_channel_id, "1504668396338413670");
  assert.equal(observed.updateValues?.panel_message_id, "1504668396338413671");
  assert.equal(row.status, "closed");
});

test("upsertDiscordSpotifyLobbyPanel stores panel message linkage even before a lobby opens", async () => {
  const observed = {
    insertValues: null as Record<string, unknown> | null,
  };

  const admin = {
    from() {
      return {
        select() {
          return {
            order() {
              return {
                limit() {
                  return Promise.resolve({
                    data: [],
                    error: null,
                  });
                },
              };
            },
          };
        },
        insert(values: Record<string, unknown>) {
          observed.insertValues = values;
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: "lobby-1",
                      room_slug: "main",
                      room_name: "Main Room",
                      visibility: "public",
                      join_key_hash: null,
                      ...values,
                      created_at: "2026-05-18T00:00:00.000Z",
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

  const row = await upsertDiscordSpotifyLobbyPanel({
    panelChannelId: "1504668396338413670",
    panelMessageId: "1504668396338413671",
    admin: admin as never,
  });

  assert.equal(observed.insertValues?.status, "closed");
  assert.equal(observed.insertValues?.panel_channel_id, "1504668396338413670");
  assert.equal(observed.insertValues?.panel_message_id, "1504668396338413671");
  assert.equal(row.panel_message_id, "1504668396338413671");
});
