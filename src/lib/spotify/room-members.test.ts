import assert from "node:assert/strict";
import test from "node:test";

import {
  joinDiscordSpotifyRoom,
  leaveDiscordSpotifyRoom,
} from "./room-members.ts";

test("joinDiscordSpotifyRoom creates joined membership state", async () => {
  const observed = {
    insertValues: null as Record<string, unknown> | null,
  };

  const admin = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    order() {
                      return {
                        limit() {
                          return {
                            maybeSingle() {
                              return Promise.resolve({ data: null, error: null });
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
        },
        insert(values: Record<string, unknown>) {
          observed.insertValues = values;
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: "member-1",
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

  const row = await joinDiscordSpotifyRoom({
    lobbyId: "lobby-1",
    discordUserId: "123456789012345678",
    spotifyUserId: "spotify-user-1",
    admin: admin as never,
  });

  assert.equal(observed.insertValues?.status, "joined");
  assert.equal(observed.insertValues?.discord_user_id, "123456789012345678");
  assert.equal(row.status, "joined");
});

test("leaveDiscordSpotifyRoom marks joined membership as left", async () => {
  const observed = {
    updateValues: null as Record<string, unknown> | null,
  };

  const admin = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    order() {
                      return {
                        limit() {
                          return {
                            maybeSingle() {
                              return Promise.resolve({
                                data: {
                                  id: "member-1",
                                  lobby_id: "lobby-1",
                                  discord_user_id: "123456789012345678",
                                  spotify_user_id: "spotify-user-1",
                                  status: "joined",
                                  joined_at: "2026-05-19T00:00:00.000Z",
                                  left_at: null,
                                  last_seen_at: null,
                                  created_at: "2026-05-19T00:00:00.000Z",
                                  updated_at: "2026-05-19T00:00:00.000Z",
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
                          id: "member-1",
                          lobby_id: "lobby-1",
                          discord_user_id: "123456789012345678",
                          spotify_user_id: "spotify-user-1",
                          status: "left",
                          joined_at: "2026-05-19T00:00:00.000Z",
                          left_at: values.left_at,
                          last_seen_at: values.last_seen_at,
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

  const row = await leaveDiscordSpotifyRoom({
    lobbyId: "lobby-1",
    discordUserId: "123456789012345678",
    admin: admin as never,
  });

  assert.equal(observed.updateValues?.status, "left");
  assert.equal(row?.status, "left");
});
