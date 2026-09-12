import { createServer, type IncomingMessage, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import {
  createSessionHandoffHandlers,
  createSessionSyncHandlers,
  type SessionTokenPair,
} from "@/lib/auth-handoff-handlers";
import {
  FITNESS_HANDOFF_MASTER_PROJECT_REF,
  FITNESS_HANDOFF_READINESS_CONTRACT_VERSION,
  type FitnessHandoffReadiness,
} from "@/lib/auth-handoff";
import {
  createFitnessHandoffSupabaseStore,
  type FitnessHandoffRpcClient,
} from "@/lib/auth-handoff-supabase-store";

export const FITNESS_HANDOFF_LOOPBACK_CONTRACT = "fitness-handoff-local-integration-v1";
export const SYNTHETIC_PORTAL_ACCESS_TOKEN = "portal-integration-synthetic-access";
export const SYNTHETIC_PORTAL_REFRESH_TOKEN = "portal-integration-synthetic-refresh";

const SYNTHETIC_HANDOFF_READINESS: FitnessHandoffReadiness = {
  authProjectRef: FITNESS_HANDOFF_MASTER_PROJECT_REF,
  contractVersion: FITNESS_HANDOFF_READINESS_CONTRACT_VERSION,
  handoffStore: "available",
  sourceCommit: "0".repeat(40),
};

type LoopbackOptions = {
  port?: number;
};

type FitnessHandoffLoopbackDependencies = {
  closeDatabase: (database: PGlite) => Promise<void>;
  createDatabase: (directory: string) => Promise<PGlite>;
  createTemporaryDirectory: () => Promise<string>;
  removeDirectory: (directory: string) => Promise<void>;
};

type HandoffRow = {
  return_to: string;
};

export type FitnessHandoffLoopback = {
  baseUrl: string;
  close: () => Promise<void>;
  temporaryDirectory: string;
};

async function createDatabase(directory: string) {
  const database = new PGlite(directory);
  try {
    await database.query(`
      create table if not exists auth_handoffs (
        handoff_digest text primary key,
        audience text not null,
        binding_digest text not null,
        issuer text not null,
        return_to text not null,
        expires_at timestamptz not null
      )
    `);
    return database;
  } catch (error) {
    await database.close().catch(() => undefined);
    throw error;
  }
}

const defaultDependencies: FitnessHandoffLoopbackDependencies = {
  closeDatabase: async (database) => database.close(),
  createDatabase,
  createTemporaryDirectory: async () => mkdtemp(path.join(os.tmpdir(), "fitness-handoff-loopback-")),
  removeDirectory: async (directory) => rm(directory, { force: true, recursive: true }),
};

function createRpcClient(database: PGlite): FitnessHandoffRpcClient {
  return {
    async rpc(name, args) {
      if (name === "begin_fitness_auth_handoff") {
        const result = await database.query(`
          insert into auth_handoffs (handoff_digest, audience, binding_digest, issuer, return_to, expires_at)
          values ($1, $2, $3, $4, $5, $6::timestamptz)
          on conflict (handoff_digest) do nothing
          returning handoff_digest
        `, [
          args.p_handoff_digest,
          args.p_audience,
          args.p_binding_digest,
          args.p_issuer,
          args.p_return_to,
          args.p_expires_at,
        ]);
        return { data: result.rows.length === 1, error: null };
      }

      if (name === "consume_fitness_auth_handoff") {
        const result = await database.query<HandoffRow>(`
          delete from auth_handoffs
          where handoff_digest = $1
            and audience = $2
            and binding_digest = $3
            and issuer = $4
            and expires_at > $5::timestamptz
          returning return_to
        `, [
          args.p_handoff_digest,
          args.p_audience,
          args.p_binding_digest,
          args.p_issuer,
          args.p_now,
        ]);
        return { data: result.rows, error: null };
      }

      return { data: null, error: new Error("Unsupported local handoff RPC") };
    },
  };
}

async function readIncomingBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function toWebRequest(request: IncomingMessage) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") {
      headers.set(name, value);
    } else if (Array.isArray(value)) {
      headers.set(name, value.join(", "));
    }
  }

  const body = request.method === "GET" || request.method === "OPTIONS"
    ? undefined
    : await readIncomingBody(request);
  return new Request(`http://127.0.0.1${request.url ?? "/"}`, {
    body,
    headers,
    method: request.method,
  });
}

function getSetCookieHeaders(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return headers.getSetCookie?.() ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
}

async function writeResponse(response: Response, nodeResponse: import("node:http").ServerResponse) {
  for (const [name, value] of response.headers.entries()) {
    if (name.toLowerCase() !== "set-cookie") {
      nodeResponse.setHeader(name, value);
    }
  }
  const cookies = getSetCookieHeaders(response);
  if (cookies.length > 0) {
    nodeResponse.setHeader("set-cookie", cookies);
  }
  nodeResponse.statusCode = response.status;
  nodeResponse.end(await response.text());
}

async function listen(server: Server, port: number) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function cleanupLoopbackScope(
  server: Server | null,
  database: PGlite | null,
  directory: string,
  dependencies: FitnessHandoffLoopbackDependencies,
) {
  const failures: unknown[] = [];
  if (server?.listening) {
    try {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    } catch (error) {
      failures.push(error);
    }
  }
  if (database) {
    try {
      await dependencies.closeDatabase(database);
    } catch (error) {
      failures.push(error);
    }
  }
  try {
    await dependencies.removeDirectory(directory);
  } catch (error) {
    failures.push(error);
  }
  if (failures.length > 0) {
    throw new Error("Fitness handoff loopback cleanup failed.");
  }
}

/**
 * Starts an explicitly local-only synthetic portal-to-Fitness handoff fixture.
 * It never reads application environment values or contacts an external service.
 */
export async function startFitnessHandoffLoopback(
  options: LoopbackOptions = {},
  dependencies: FitnessHandoffLoopbackDependencies = defaultDependencies,
): Promise<FitnessHandoffLoopback> {
  const directory = await dependencies.createTemporaryDirectory();
  let database: PGlite | null = null;
  let server: Server | null = null;
  try {
    database = await dependencies.createDatabase(directory);
    const store = createFitnessHandoffSupabaseStore(createRpcClient(database));
    const runtime = {
      now: () => Math.floor(Date.now() / 1000),
      store,
    };
    const handoff = createSessionHandoffHandlers({
      getReadiness: () => SYNTHETIC_HANDOFF_READINESS,
      getRuntime: () => runtime,
    });
    const sync = createSessionSyncHandlers({
      getHandoffRuntime: () => runtime,
      getReadiness: () => SYNTHETIC_HANDOFF_READINESS,
      validateSession: async (tokens: SessionTokenPair) => (
        tokens.accessToken === SYNTHETIC_PORTAL_ACCESS_TOKEN
        && tokens.refreshToken === SYNTHETIC_PORTAL_REFRESH_TOKEN
          ? tokens
          : null
      ),
    });

    server = createServer(async (request, response) => {
      try {
        if (request.method === "GET" && request.url === "/__handoff-test/health") {
          response.setHeader("Cache-Control", "no-store");
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({
            contract: FITNESS_HANDOFF_LOOPBACK_CONTRACT,
            durable: true,
            ok: true,
            synthetic: true,
          }));
          return;
        }

        const webRequest = await toWebRequest(request);
        if (request.url === "/auth/session-handoff") {
          if (request.method !== "OPTIONS" && request.method !== "POST") {
            response.statusCode = 405;
            response.end();
            return;
          }
          await writeResponse(
            request.method === "OPTIONS" ? await handoff.OPTIONS(webRequest) : await handoff.POST(webRequest),
            response,
          );
          return;
        }
        if (request.url === "/auth/session-sync") {
          if (request.method !== "OPTIONS" && request.method !== "POST") {
            response.statusCode = 405;
            response.end();
            return;
          }
          await writeResponse(
            request.method === "OPTIONS" ? await sync.OPTIONS(webRequest) : await sync.POST(webRequest),
            response,
          );
          return;
        }

        response.statusCode = 404;
        response.end();
      } catch {
        response.statusCode = 500;
        response.end();
      }
    });
    await listen(server, options.port ?? 0);

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Fitness handoff loopback did not bind a TCP port.");
    }

    let closed = false;
    return {
      baseUrl: `http://127.0.0.1:${address.port}`,
      temporaryDirectory: directory,
      async close() {
        if (closed) {
          return;
        }
        closed = true;
        await cleanupLoopbackScope(server, database, directory, dependencies);
      },
    };
  } catch (error) {
    await cleanupLoopbackScope(server, database, directory, dependencies).catch(() => undefined);
    throw error;
  }
}

if (process.argv[1]?.endsWith("fitness-auth-handoff-loopback.ts")) {
  startFitnessHandoffLoopback().then((loopback) => {
    let closing = false;
    const close = () => {
      if (closing) {
        return;
      }
      closing = true;
      void loopback.close().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
    process.stdout.write(`${JSON.stringify({ baseUrl: loopback.baseUrl, contract: FITNESS_HANDOFF_LOOPBACK_CONTRACT, durable: true, synthetic: true })}\n`);
  }).catch(() => {
    process.exitCode = 1;
  });
}
