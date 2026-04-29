import fs from "node:fs/promises";
import path from "node:path";
import { buildSessionCookies, createAnonClient } from "./fitness-qa-config.mjs";

const MIN_TTL_SECONDS = 90;

function readTopLevelSession(artifact) {
  if (!artifact || typeof artifact !== "object") {
    return null;
  }

  if (
    typeof artifact.access_token === "string"
    && typeof artifact.refresh_token === "string"
    && typeof artifact.expires_at === "number"
  ) {
    return {
      format: "supabase-session",
      accessToken: artifact.access_token,
      refreshToken: artifact.refresh_token,
      expiresAt: artifact.expires_at,
      tokenType: typeof artifact.token_type === "string" ? artifact.token_type : "bearer",
      expiresIn: typeof artifact.expires_in === "number" ? artifact.expires_in : null,
      user: artifact.user ?? null,
    };
  }

  return null;
}

function readQaArtifactSession(artifact) {
  if (!artifact || typeof artifact !== "object" || !artifact.session || typeof artifact.session !== "object") {
    return null;
  }

  if (
    typeof artifact.session.accessToken === "string"
    && typeof artifact.session.refreshToken === "string"
    && typeof artifact.session.expiresAt === "number"
  ) {
    return {
      format: "qa-session-artifact",
      accessToken: artifact.session.accessToken,
      refreshToken: artifact.session.refreshToken,
      expiresAt: artifact.session.expiresAt,
      tokenType: "bearer",
      expiresIn: null,
      user: artifact.user ?? null,
    };
  }

  return null;
}

export function readArtifactSession(artifact) {
  return readTopLevelSession(artifact) ?? readQaArtifactSession(artifact);
}

function mergeRefreshedSession(artifact, nextSession) {
  const parsed = readArtifactSession(artifact);
  if (!parsed) {
    throw new Error("Unsupported auth artifact format.");
  }

  if (parsed.format === "supabase-session") {
    return {
      ...artifact,
      access_token: nextSession.access_token,
      token_type: nextSession.token_type ?? artifact.token_type ?? "bearer",
      expires_in: nextSession.expires_in ?? artifact.expires_in ?? null,
      expires_at: nextSession.expires_at,
      refresh_token: nextSession.refresh_token ?? artifact.refresh_token,
      user: nextSession.user ?? artifact.user ?? null,
      refreshed_at: new Date().toISOString(),
    };
  }

  const baseUrl = typeof artifact.baseUrl === "string" && artifact.baseUrl.length > 0
    ? artifact.baseUrl
    : "http://127.0.0.1:3000";

  return {
    ...artifact,
    generatedAt: new Date().toISOString(),
    session: {
      ...artifact.session,
      accessToken: nextSession.access_token,
      refreshToken: nextSession.refresh_token ?? artifact.session.refreshToken,
      expiresAt: nextSession.expires_at,
    },
    cookies: buildSessionCookies({
      access_token: nextSession.access_token,
      refresh_token: nextSession.refresh_token ?? artifact.session.refreshToken,
      expires_at: nextSession.expires_at,
    }, baseUrl),
  };
}

function needsRefresh(session, minTtlSeconds = MIN_TTL_SECONDS) {
  return !session || session.expiresAt <= Math.floor(Date.now() / 1000) + minTtlSeconds;
}

export async function readSessionArtifactFile(artifactPath) {
  const resolvedPath = path.resolve(String(artifactPath));
  const raw = await fs.readFile(resolvedPath, "utf8");
  const artifact = JSON.parse(raw);
  const session = readArtifactSession(artifact);
  if (!session) {
    throw new Error(`Unsupported auth artifact at ${resolvedPath}.`);
  }

  return {
    path: resolvedPath,
    artifact,
    session,
  };
}

export async function refreshSessionArtifactFile(artifactPath) {
  const { path: resolvedPath, artifact, session } = await readSessionArtifactFile(artifactPath);
  const anonClient = createAnonClient();
  const { data, error } = await anonClient.auth.refreshSession({
    refresh_token: session.refreshToken,
  });

  if (error) {
    throw new Error(`Unable to refresh auth artifact ${resolvedPath}: ${error.message ?? "Unknown Supabase error"}`);
  }

  if (!data.session) {
    throw new Error(`Supabase refresh did not return a session for ${resolvedPath}.`);
  }

  const mergedArtifact = mergeRefreshedSession(artifact, {
    ...data.session,
    user: data.user ?? artifact.user ?? null,
  });
  await fs.writeFile(resolvedPath, `${JSON.stringify(mergedArtifact, null, 2)}\n`, "utf8");

  return {
    path: resolvedPath,
    artifact: mergedArtifact,
    session: readArtifactSession(mergedArtifact),
  };
}

export async function ensureFreshSessionArtifactFile(artifactPath, options = {}) {
  const minTtlSeconds = Number(options.minTtlSeconds ?? MIN_TTL_SECONDS);
  const current = await readSessionArtifactFile(artifactPath);
  if (!needsRefresh(current.session, minTtlSeconds)) {
    return current;
  }

  return refreshSessionArtifactFile(artifactPath);
}

export function buildCookiesFromArtifactSession(session, baseUrl) {
  return buildSessionCookies({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_at: session.expiresAt,
  }, baseUrl);
}
