import "server-only";

import { getDiscordSpotifyConnection } from "@/lib/spotify/tokens";
import { updateDiscordSpotifyLobbySettings, type DiscordSpotifyLobbyRow } from "@/lib/spotify/lobbies";
import { buildSpotifyPlayerAccessToken, getSpotifyQueueSnapshot, type SpotifyQueueSnapshot } from "@/lib/spotify/player";
import {
  clearStaleMirroredDiscordSpotifyQueueItems,
  getActiveDiscordSpotifyQueueItems,
  insertMirroredDiscordSpotifyQueueItem,
  markDiscordSpotifyQueueItemMirrorSeen,
  markDiscordSpotifyQueueItemPlaying,
  reconcileActiveDiscordSpotifyQueueWithPlaybackSnapshot,
  type DiscordSpotifyQueueItemRow,
} from "@/lib/spotify/queue";

export type SpotifyMirrorSyncResult =
  | { ok: true; inserted: number; merged: number; playingUpdated: boolean; queueSize: number }
  | { ok: false; reason: "disabled" | "closed" | "missing_host" | "missing_connection" | "sync_failed"; message: string };

export type SpotifyMirrorReconcilePlan = {
  inserts: Array<{
    spotifyUri: string;
    spotifyUrl: string | null;
    trackTitle: string | null;
    artistName: string | null;
    albumName: string | null;
    durationMs: number | null;
    displayPosition: number;
  }>;
  merges: Array<{
    queueItemId: string;
    displayPosition: number;
  }>;
  coveredByDiscordOwned: number;
  currentlyPlayingItemId: string | null;
};

function isActiveApprovedQueueItem(item: DiscordSpotifyQueueItemRow): boolean {
  return item.approval_state === "approved"
    && (item.playback_state === "queued" || item.playback_state === "playing");
}

function hasRoomManagedPlaybackInProgress(items: DiscordSpotifyQueueItemRow[]): boolean {
  return items.some((item) => (
    item.source_type !== "spotify_mirror"
    && item.approval_state === "approved"
    && item.playback_state === "playing"
  ));
}

function findMirrorMergeCandidate(args: {
  spotifyUri: string;
  existingItems: DiscordSpotifyQueueItemRow[];
  usedItemIds: Set<string>;
}): DiscordSpotifyQueueItemRow | null {
  const normalizedUri = args.spotifyUri.toLowerCase();
  return args.existingItems.find((item) => (
    !args.usedItemIds.has(item.id)
    && item.spotify_uri.toLowerCase() === normalizedUri
    && item.source_type === "spotify_mirror"
    && isActiveApprovedQueueItem(item)
  )) ?? null;
}

function findDiscordOwnedCoverageCandidate(args: {
  spotifyUri: string;
  existingItems: DiscordSpotifyQueueItemRow[];
  usedItemIds: Set<string>;
}): DiscordSpotifyQueueItemRow | null {
  const normalizedUri = args.spotifyUri.toLowerCase();
  return args.existingItems.find((item) => (
    !args.usedItemIds.has(item.id)
    && item.spotify_uri.toLowerCase() === normalizedUri
    && (item.source_type === "discord_search" || item.source_type === "discord_link")
    && isActiveApprovedQueueItem(item)
  )) ?? null;
}

export function reconcileSpotifyMirrorSnapshot(args: {
  snapshot: SpotifyQueueSnapshot;
  existingItems: DiscordSpotifyQueueItemRow[];
  roomManagedPlaybackInProgress?: boolean;
}): SpotifyMirrorReconcilePlan {
  const usedItemIds = new Set<string>();
  const merges: SpotifyMirrorReconcilePlan["merges"] = [];
  const inserts: SpotifyMirrorReconcilePlan["inserts"] = [];
  let coveredByDiscordOwned = 0;

  args.snapshot.queue.forEach((track, index) => {
    const displayPosition = index + 1;
    const mergeCandidate = findMirrorMergeCandidate({
      spotifyUri: track.spotifyUri,
      existingItems: args.existingItems,
      usedItemIds,
    });

    if (mergeCandidate) {
      usedItemIds.add(mergeCandidate.id);
      merges.push({
        queueItemId: mergeCandidate.id,
        displayPosition,
      });
      return;
    }

    const coverageCandidate = findDiscordOwnedCoverageCandidate({
      spotifyUri: track.spotifyUri,
      existingItems: args.existingItems,
      usedItemIds,
    });
    if (coverageCandidate) {
      usedItemIds.add(coverageCandidate.id);
      coveredByDiscordOwned += 1;
      return;
    }

    inserts.push({
      spotifyUri: track.spotifyUri,
      spotifyUrl: track.spotifyUrl,
      trackTitle: track.trackTitle,
      artistName: track.artistName,
      albumName: track.albumName,
      durationMs: track.durationMs,
      displayPosition,
    });
  });

  const currentUri = args.snapshot.currentlyPlaying?.spotifyUri.toLowerCase() ?? null;
  const currentDiscordOwnedItem = currentUri && args.roomManagedPlaybackInProgress
    ? args.existingItems.find((item) => (
      item.spotify_uri.toLowerCase() === currentUri
      && item.source_type !== "spotify_mirror"
      && isActiveApprovedQueueItem(item)
    )) ?? null
    : null;
  const currentMirrorItem = currentUri
    ? args.existingItems.find((item) => (
      item.spotify_uri.toLowerCase() === currentUri
      && isActiveApprovedQueueItem(item)
      && item.source_type === "spotify_mirror"
    )) ?? null
    : null;
  const currentlyPlayingItem = currentDiscordOwnedItem ?? currentMirrorItem;

  return {
    inserts,
    merges,
    coveredByDiscordOwned,
    currentlyPlayingItemId: currentlyPlayingItem?.id ?? null,
  };
}

export async function syncSpotifyMirrorForLobby(lobby: DiscordSpotifyLobbyRow): Promise<SpotifyMirrorSyncResult> {
  if (lobby.status !== "open") {
    return { ok: false, reason: "closed", message: "Spotify Club room is closed." };
  }

  if (!lobby.spotify_mirror_enabled) {
    return { ok: false, reason: "disabled", message: "Live Spotify queue mirror is off." };
  }

  if (!lobby.host_discord_user_id) {
    return { ok: false, reason: "missing_host", message: "Live Spotify queue mirror needs a room host." };
  }

  const connection = await getDiscordSpotifyConnection(lobby.host_discord_user_id);
  if (!connection) {
    return { ok: false, reason: "missing_connection", message: "Live Spotify queue mirror needs the host to connect Spotify." };
  }

  try {
    const accessToken = await buildSpotifyPlayerAccessToken(connection);
    const snapshot = await getSpotifyQueueSnapshot(connection, accessToken);
    const existingItems = await getActiveDiscordSpotifyQueueItems({ lobbyId: lobby.id });
    const roomManagedPlaybackInProgress = hasRoomManagedPlaybackInProgress(existingItems);
    const plan = reconcileSpotifyMirrorSnapshot({
      snapshot,
      existingItems,
      roomManagedPlaybackInProgress,
    });

    await Promise.all(plan.merges.map((merge) => markDiscordSpotifyQueueItemMirrorSeen({
      queueItemId: merge.queueItemId,
      displayPosition: merge.displayPosition,
    })));

    await Promise.all(plan.inserts.map((insert) => insertMirroredDiscordSpotifyQueueItem({
      lobbyId: lobby.id,
      hostDiscordUserId: lobby.host_discord_user_id ?? connection.discord_user_id,
      ...insert,
    })));

    if (plan.currentlyPlayingItemId) {
      await markDiscordSpotifyQueueItemPlaying({
        lobbyId: lobby.id,
        queueItemId: plan.currentlyPlayingItemId,
      });
    }

    const activeSpotifyUris = [
      ...(snapshot.currentlyPlaying ? [snapshot.currentlyPlaying.spotifyUri] : []),
      ...snapshot.queue.map((track) => track.spotifyUri),
    ];

    if (roomManagedPlaybackInProgress) {
      await reconcileActiveDiscordSpotifyQueueWithPlaybackSnapshot({
        lobbyId: lobby.id,
        activeSpotifyUris,
        currentSpotifyUri: snapshot.currentlyPlaying?.spotifyUri ?? null,
      });
    }

    await clearStaleMirroredDiscordSpotifyQueueItems({
      lobbyId: lobby.id,
      activeSpotifyUris,
    });

    await updateDiscordSpotifyLobbySettings({
      lobbyId: lobby.id,
      spotifyMirrorLastSyncedAt: new Date().toISOString(),
      spotifyMirrorErrorCount: 0,
    });

    return {
      ok: true,
      inserted: plan.inserts.length,
      merged: plan.merges.length,
      playingUpdated: Boolean(plan.currentlyPlayingItemId),
      queueSize: snapshot.queue.length,
    };
  } catch (error) {
    await updateDiscordSpotifyLobbySettings({
      lobbyId: lobby.id,
      spotifyMirrorErrorCount: lobby.spotify_mirror_error_count + 1,
    }).catch(() => null);

    return {
      ok: false,
      reason: "sync_failed",
      message: error instanceof Error ? error.message : "Live Spotify queue mirror could not sync right now.",
    };
  }
}
