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
const buildDirectory = await mkdtemp(
  path.join(apiDirectory, ".studio-workspace-test-"),
);
const bundlePath = path.join(buildDirectory, "studio-workspace.mjs");
const exportBundlePath = path.join(buildDirectory, "workspace-export.mjs");

// The production database adapter is not used by these tests, but the module
// creates a lazy PostgreSQL pool at import time and requires a connection URL.
process.env.DATABASE_URL ??= "postgres://127.0.0.1:5432/solo_studio_test";

let createStudioWorkspaceRouter;
let buildWorkspaceExport;
let parseWorkspaceImport;
try {
  await Promise.all([
    build({
      entryPoints: [path.join(apiDirectory, "src/routes/studio-workspace.ts")],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: bundlePath,
      external: ["*.node", "pg-native", "@clerk/express", "events", "express"],
      banner: {
        js: "import { createRequire as createNodeRequire } from 'node:module'; globalThis.require = createNodeRequire(import.meta.url);",
      },
      logLevel: "silent",
    }),
    build({
      entryPoints: [
        path.join(apiDirectory, "../solo-studio/src/lib/workspace-export.ts"),
      ],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: exportBundlePath,
      logLevel: "silent",
    }),
  ]);

  ({ createStudioWorkspaceRouter } = await import(
    pathToFileURL(bundlePath).href
  ));
  ({ buildWorkspaceExport, parseWorkspaceImport } = await import(
    pathToFileURL(exportBundlePath).href
  ));
} catch (error) {
  await rm(buildDirectory, { recursive: true, force: true });
  throw error;
}

let server;
let origin;
let records;

before(async () => {
  records = new Map();
  const repository = {
    async findByUserId(userId) {
      const workspace = records.get(userId);
      return workspace ? structuredClone(workspace) : undefined;
    },
    async saveForUser(userId, state, expectedVersion) {
      const current = records.get(userId);
      if (
        (expectedVersion === null && current) ||
        (expectedVersion !== null && current?.version !== expectedVersion)
      ) {
        return { current: current ? structuredClone(current) : undefined };
      }
      const saved = {
        state: structuredClone(state),
        version: (current?.version ?? 0) + 1,
      };
      records.set(userId, saved);
      return { saved: structuredClone(saved) };
    },
  };
  const app = express();

  app.use(express.json());
  app.use(
    createStudioWorkspaceRouter({
      repository,
      // This resolver exists only in the test harness. Production uses Clerk's
      // verified session through the router's default resolver.
      resolveUserId: (request) => request.get("x-studio-test-user"),
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
});

function workspaceRequest(userId, method = "GET", body) {
  const headers = {};
  if (userId) headers["x-studio-test-user"] = userId;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  return fetch(`${origin}/studio/workspace`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("users can only read and update their own workspace", async () => {
  const aliceState = { businessName: "Alice Studio", privateNote: "Alice only" };
  const aliceSave = await workspaceRequest("user-alice", "PUT", {
    state: aliceState,
    expectedVersion: null,
    userId: "user-bob",
  });
  assert.equal(aliceSave.status, 200);

  const bobBeforeSetup = await workspaceRequest("user-bob");
  assert.equal(bobBeforeSetup.status, 404);

  const bobState = { businessName: "Bob Studio", privateNote: "Bob only" };
  const bobSave = await workspaceRequest("user-bob", "PUT", {
    state: bobState,
    expectedVersion: null,
    userId: "user-alice",
  });
  assert.equal(bobSave.status, 200);

  const aliceRead = await workspaceRequest("user-alice");
  const bobRead = await workspaceRequest("user-bob");
  assert.deepEqual((await aliceRead.json()).state, aliceState);
  assert.deepEqual((await bobRead.json()).state, bobState);
  assert.deepEqual([...records.keys()].sort(), ["user-alice", "user-bob"]);

  const aliceUpdate = await workspaceRequest("user-alice", "PUT", {
    state: { ...aliceState, businessName: "Alice Updated" },
    expectedVersion: 1,
  });
  assert.equal(aliceUpdate.status, 200);

  const bobStillPrivate = await workspaceRequest("user-bob");
  assert.deepEqual((await bobStillPrivate.json()).state, bobState);
});

test("interleaved saves reject a stale tab without losing the newer invoice", async () => {
  const initialState = {
    proposals: [{ id: "proposal-1", status: "Accepted" }],
    invoices: [],
    settings: { businessName: "Studio" },
  };
  const created = await workspaceRequest("two-tabs", "PUT", {
    state: initialState,
    expectedVersion: null,
  });
  assert.equal(created.status, 200);
  const firstTab = await workspaceRequest("two-tabs");
  const secondTab = await workspaceRequest("two-tabs");
  const firstSnapshot = await firstTab.json();
  const secondSnapshot = await secondTab.json();

  const invoice = {
    id: "invoice-from-proposal-1",
    sourceProposalId: "proposal-1",
    status: "Draft",
  };
  const firstSave = await workspaceRequest("two-tabs", "PUT", {
    state: { ...firstSnapshot.state, invoices: [invoice] },
    expectedVersion: firstSnapshot.version,
  });
  assert.equal(firstSave.status, 200);
  assert.equal((await firstSave.json()).version, 2);

  const staleSave = await workspaceRequest("two-tabs", "PUT", {
    state: {
      ...secondSnapshot.state,
      settings: { businessName: "Changed in the second tab" },
    },
    expectedVersion: secondSnapshot.version,
  });
  assert.equal(staleSave.status, 409);
  const conflict = await staleSave.json();
  assert.equal(conflict.current.version, 2);
  assert.deepEqual(conflict.current.state.invoices, [invoice]);

  const finalRead = await workspaceRequest("two-tabs");
  assert.deepEqual((await finalRead.json()).state.invoices, [invoice]);
});

test("unauthenticated reads and writes are rejected without caching", async () => {
  const read = await workspaceRequest(null);
  assert.equal(read.status, 401);
  assert.equal(read.headers.get("cache-control"), "private, no-store");

  const write = await workspaceRequest(null, "PUT", {
    state: { businessName: "Should not be saved" },
  });
  assert.equal(write.status, 401);
  assert.equal(write.headers.get("cache-control"), "private, no-store");
  assert.equal(records.has(""), false);
});

test("workspace backup has a version and timestamp without account identifiers", () => {
  const exportedAt = "2026-10-04T12:34:56.000Z";
  const workspace = {
    clients: [{ id: "client-01", name: "Alice", clientId: "related-client-02" }],
    settings: { businessName: "Alice Studio" },
    ownerId: "user_alice_secret",
    user_id: "user_alice_secret",
    clerkUserId: "user_alice_secret",
    nested: { clerk_id: "user_alice_secret" },
  };

  const backup = buildWorkspaceExport(workspace, exportedAt);

  assert.equal(backup.formatVersion, 1);
  assert.equal(backup.exportedAt, exportedAt);
  assert.deepEqual(backup.data, {
    clients: [{ id: "client-01", name: "Alice", clientId: "related-client-02" }],
    settings: { businessName: "Alice Studio" },
    nested: {},
  });
  assert.equal(JSON.stringify(backup).includes("user_alice_secret"), false);
});

test("valid backups can be validated for restore without importing account identifiers", () => {
  const backup = buildWorkspaceExport({
    settings: {
      businessName: "Alice Studio",
      defaultHourlyRatePence: 6500,
      designTheme: "evergreen",
    },
    leads: [{ id: "lead-01", name: "Sophie" }],
    clients: [],
    proposals: [],
    projects: [],
    tasks: [],
    invoices: [],
    expenses: [],
    timeEntries: [],
    caseStudies: [],
    launchDrafts: [],
  });

  assert.deepEqual(parseWorkspaceImport(backup).data, backup.data);

  const unsupportedVersion = { ...backup, formatVersion: 2 };
  assert.throws(
    () => parseWorkspaceImport(unsupportedVersion),
    /version is not supported/,
  );

  const withOwnerId = {
    ...backup,
    data: { ...backup.data, settings: { ...backup.data.settings, ownerId: "other-user" } },
  };
  assert.throws(
    () => parseWorkspaceImport(withOwnerId),
    /account identifiers/,
  );

  const missingCollection = {
    ...backup,
    data: { ...backup.data, invoices: undefined },
  };
  assert.throws(
    () => parseWorkspaceImport(missingCollection),
    /missing its invoices records/,
  );
});