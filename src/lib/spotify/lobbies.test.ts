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
  assert.equal(buildDiscordSpotifyLobbyStatusSummary(null), "Spotify Club lobby is Closed.");

  assert.equal(formatDiscordSpotifyLobbyStatusLabel({
    id: "lobby-1",
    status: "open",
    host_discord_user_id: "123456789012345678",
    host_spotify_user_id: "spotify-user",
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
      status: "open",
      host_discord_user_id: "123456789012345678",
      host_spotify_user_id: "spotify-user",
      title: null,
      description: null,
      panel_channel_id: null,
      panel_message_id: null,
      opened_at: "2026-05-18T00:00:00.000Z",
      closed_at: null,
      created_at: "2026-05-18T00:00:00.000Z",
      updated_at: "2026-05-18T00:00:00.000Z",
    }),
    "Spotify Club lobby is Open.\nHost: <@123456789012345678>",
  );
});

test("openDiscordSpotifyLobby updates the latest row into an open lobby", async () => {
  const observed = {
    updateValues: null as Record<string, unknown> | null,
    updateFilters: [] as Array<[string, unknown]>,
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
        update(values: Record<string, unknown>) {
          observed.updateValues = values;
          return {
            eq(column: string, value: unknown) {
              observed.updateFilters.push([column, value]);
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

  const row = await openDiscordSpotifyLobby({
    hostDiscordUserId: "123456789012345678",
    hostSpotifyUserId: "spotify-user",
    admin: admin as never,
  });

  assert.equal(observed.updateFilters[0]?.[0], "id");
  assert.equal(observed.updateFilters[0]?.[1], "lobby-1");
  assert.equal(observed.updateValues?.status, "open");
  assert.equal(observed.updateValues?.host_discord_user_id, "123456789012345678");
  assert.equal(observed.updateValues?.host_spotify_user_id, "spotify-user");
  assert.equal(observed.updateValues?.panel_channel_id, "1504668396338413670");
  assert.equal(observed.updateValues?.panel_message_id, "1504668396338413671");
  assert.equal(row.status, "open");
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
