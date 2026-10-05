import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import express from "express";
import { build } from "esbuild";

const apiDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const buildDirectory = await mkdtemp(path.join(apiDirectory, ".email-test-"));
const routerBundlePath = path.join(buildDirectory, "email-router.mjs");
const helperBundlePath = path.join(buildDirectory, "email-oauth.mjs");
const analysisBundlePath = path.join(buildDirectory, "email-analysis.mjs");

process.env.DATABASE_URL ??= "postgres://127.0.0.1:5432/solo_studio_test";

const environmentKeys = [
  "EMAIL_TOKEN_ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "REPLIT_DOMAINS",
];
const oldEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);
process.env.EMAIL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.GOOGLE_CLIENT_ID = "google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
process.env.MICROSOFT_CLIENT_ID = "microsoft-client-id";
process.env.MICROSOFT_CLIENT_SECRET = "microsoft-client-secret";
process.env.REPLIT_DOMAINS = "studio.example";

let createEmailRouter;
let decryptEmailSecret;
let hashOAuthState;
let analyzeMailboxPage;
try {
  await Promise.all([
    build({
      entryPoints: [path.join(apiDirectory, "src/routes/email.ts")],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: routerBundlePath,
      external: ["*.node", "pg-native", "@clerk/express", "events", "express"],
      banner: {
        js: "import { createRequire as createNodeRequire } from 'node:module'; globalThis.require = createNodeRequire(import.meta.url);",
      },
      logLevel: "silent",
    }),
    build({
      entryPoints: [path.join(apiDirectory, "src/lib/email-oauth.ts")],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: helperBundlePath,
      logLevel: "silent",
    }),
    build({
      entryPoints: [path.join(apiDirectory, "src/lib/email-analysis.ts")],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: analysisBundlePath,
      logLevel: "silent",
    }),
  ]);
  ({ createEmailRouter } = await import(pathToFileURL(routerBundlePath).href));
  ({ decryptEmailSecret, hashOAuthState } = await import(
    pathToFileURL(helperBundlePath).href
  ));
  ({ analyzeMailboxPage } = await import(
    pathToFileURL(analysisBundlePath).href
  ));
} catch (error) {
  await rm(buildDirectory, { recursive: true, force: true });
  throw error;
}

let server;
let origin;
let repository;
let transactions;
let connections;

before(async () => {
  transactions = new Map();
  connections = new Map();
  repository = {
    async listConnections(userId) {
      return [...connections.values()]
        .filter((connection) => connection.userId === userId)
        .map(({ provider, email, connectedAt }) => ({
          provider,
          email,
          connectedAt,
        }));
    },
    async findConnection(userId, provider) {
      const connection = connections.get(`${userId}:${provider}`);
      return connection ? structuredClone(connection) : undefined;
    },
    async saveConnection(
      userId,
      provider,
      email,
      encryptedRefreshToken,
      scopes,
      now,
    ) {
      connections.set(`${userId}:${provider}`, {
        userId,
        provider,
        email,
        encryptedRefreshToken,
        scopes,
        connectedAt: now,
      });
    },
    async updateRefreshToken(
      userId,
      provider,
      encryptedRefreshToken,
      scopes,
      now,
    ) {
      const key = `${userId}:${provider}`;
      const connection = connections.get(key);
      if (connection) {
        connections.set(key, {
          ...connection,
          encryptedRefreshToken,
          scopes,
          updatedAt: now,
        });
      }
    },
    async disconnect(userId, provider) {
      connections.delete(`${userId}:${provider}`);
    },
    async deleteExpiredTransactions() {},
    async saveTransaction(transaction) {
      transactions.set(transaction.stateHash, structuredClone(transaction));
    },
    async consumeTransaction(stateHash) {
      const transaction = transactions.get(stateHash);
      transactions.delete(stateHash);
      return transaction ? structuredClone(transaction) : undefined;
    },
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createEmailRouter({
      repository,
      resolveUserId: (request) => request.get("x-studio-test-user"),
      fetcher: providerFetch,
    }),
  );
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await rm(buildDirectory, { recursive: true, force: true });
  for (const [key, value] of Object.entries(oldEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const userHeaders = {
  "x-studio-test-user": "user-alice",
  Referer: "https://studio.example/settings",
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function providerFetch(input, init = {}) {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return jsonResponse({
      access_token: "fresh-access-token",
      refresh_token: "rotated-refresh-token",
      scope: "https://www.googleapis.com/auth/gmail.readonly",
    });
  }
  if (url.hostname === "openidconnect.googleapis.com") {
    return jsonResponse({ email: "alice@example.co.uk" });
  }
  if (
    url.hostname === "gmail.googleapis.com" &&
    url.pathname.endsWith("/messages") &&
    !url.pathname.endsWith("/messages/message-1")
  ) {
    return jsonResponse({
      messages: [{ id: "message-1" }],
      nextPageToken: undefined,
      resultSizeEstimate: 1,
    });
  }
  if (
    url.hostname === "gmail.googleapis.com" &&
    url.pathname.endsWith("/messages/message-1")
  ) {
    const body = Buffer.from(
      "I need a quote for a new website. Can we schedule a call?",
    ).toString("base64url");
    return jsonResponse({
      internalDate: "1791072000000",
      snippet: "Private body text must not be returned",
      payload: {
        headers: [
          { name: "From", value: "Jamie Reed <jamie@example.co.uk>" },
          { name: "To", value: "Alice <alice@example.co.uk>" },
          { name: "Subject", value: "Website project enquiry" },
        ],
        mimeType: "text/plain",
        body: { data: body },
      },
    });
  }
  throw new Error(`Unexpected fake provider request: ${url.href} ${init.method ?? "GET"}`);
}

test("mailbox connections, OAuth and whole-mailbox analysis stay user-scoped", async () => {
  const unauthenticated = await fetch(`${origin}/api/email/connections`);
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.headers.get("cache-control"), "private, no-store");

  const statusResponse = await fetch(`${origin}/api/email/connections`, {
    headers: userHeaders,
  });
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.equal(status.providers.length, 2);
  assert.equal(status.providers.find((item) => item.provider === "google").configured, true);
  assert.equal(
    status.providers.find((item) => item.provider === "google").redirectUri,
    "https://studio.example/api/email/oauth/google/callback",
  );
  assert.deepEqual(status.connections, []);

  const authorizationResponse = await fetch(
    `${origin}/api/email/connections/google/authorization`,
    { method: "POST", headers: userHeaders, redirect: "manual" },
  );
  assert.equal(authorizationResponse.status, 200);
  const authorization = await authorizationResponse.json();
  const authorizationUrl = new URL(authorization.authorizationUrl);
  const state = authorizationUrl.searchParams.get("state");
  assert.ok(state);
  assert.equal(
    authorizationUrl.searchParams.get("redirect_uri"),
    "https://studio.example/api/email/oauth/google/callback",
  );
  assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
  const transaction = transactions.get(hashOAuthState(state));
  assert.equal(transaction.userId, "user-alice");
  assert.notEqual(transaction.codeVerifier, state);
  assert.notEqual(transaction.stateHash, state);
  assert.ok(
    decryptEmailSecret(transaction.codeVerifier, "oauth:google:user-alice")
      .length >= 43,
  );

  const callback = await fetch(
    `${origin}/api/email/oauth/google/callback?${new URLSearchParams({
      state,
      code: "single-use-code",
    })}`,
    { redirect: "manual" },
  );
  assert.equal(callback.status, 302);
  const callbackLocation = new URL(callback.headers.get("location"));
  assert.equal(callbackLocation.pathname, "/settings");
  assert.equal(callbackLocation.searchParams.get("emailConnection"), "connected");
  assert.equal(callbackLocation.searchParams.get("provider"), "google");
  assert.equal(transactions.has(hashOAuthState(state)), false);

  const stored = connections.get("user-alice:google");
  assert.equal(stored.email, "alice@example.co.uk");
  assert.notEqual(stored.encryptedRefreshToken, "rotated-refresh-token");
  assert.equal(
    decryptEmailSecret(
      stored.encryptedRefreshToken,
      "refresh:google:user-alice",
    ),
    "rotated-refresh-token",
  );
  assert.throws(() =>
    decryptEmailSecret(
      stored.encryptedRefreshToken,
      "refresh:google:user-bob",
    ),
  );
  assert.equal(await repository.findConnection("user-bob", "google"), undefined);

  const analysisResponse = await fetch(
    `${origin}/api/email/connections/google/analysis-batch`,
    {
      method: "POST",
      headers: { ...userHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ cursor: null }),
    },
  );
  assert.equal(analysisResponse.status, 200);
  const analysis = await analysisResponse.json();
  assert.equal(analysis.complete, true);
  assert.equal(analysis.scannedCount, 1);
  assert.equal(analysis.candidates.length, 1);
  assert.equal(analysis.candidates[0].email, "jamie@example.co.uk");
  assert.equal(analysis.candidates[0].name, "Jamie Reed");
  assert.deepEqual(
    analysis.candidates[0].signals.sort(),
    ["budget", "enquiry", "meeting", "project"],
  );
  assert.equal(
    JSON.stringify(analysis).includes("Private body text must not be returned"),
    false,
  );
  assert.equal(
    decryptEmailSecret(
      (await repository.findConnection("user-alice", "google"))
        .encryptedRefreshToken,
      "refresh:google:user-alice",
    ),
    "rotated-refresh-token",
  );

  const disconnectResponse = await fetch(
    `${origin}/api/email/connections/google`,
    { method: "DELETE", headers: userHeaders },
  );
  assert.equal(disconnectResponse.status, 204);
  assert.equal(await repository.findConnection("user-alice", "google"), undefined);
  assert.equal(await repository.findConnection("user-bob", "google"), undefined);
});

test("Microsoft mailbox pagination preserves Graph skip cursors", async () => {
  let requestedUrl;
  const firstPage = await analyzeMailboxPage(
    "microsoft",
    "test-access-token",
    "alice@example.co.uk",
    null,
    async (input) => {
      requestedUrl = new URL(String(input));
      return jsonResponse({
        value: [],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/me/messages?$skip=25",
      });
    },
  );
  assert.equal(firstPage.cursor, "skip:25");
  assert.equal(firstPage.complete, false);

  await analyzeMailboxPage(
    "microsoft",
    "test-access-token",
    "alice@example.co.uk",
    firstPage.cursor,
    async (input) => {
      requestedUrl = new URL(String(input));
      return jsonResponse({ value: [] });
    },
  );
  assert.equal(requestedUrl.searchParams.get("$skip"), "25");
  assert.equal(requestedUrl.searchParams.get("$skiptoken"), null);
});