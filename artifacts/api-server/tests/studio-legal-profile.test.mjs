import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import express from "express";
import { after, test } from "node:test";

const apiDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const buildDirectory = await mkdtemp(
  path.join(apiDirectory, ".studio-legal-profile-test-"),
);
const bundlePath = path.join(buildDirectory, "studio-legal-profile.mjs");
process.env.DATABASE_URL ??= "postgres://127.0.0.1:5432/solo_studio_test";

let createStudioLegalProfileRouter;
try {
  await build({
    entryPoints: [path.join(apiDirectory, "src/routes/studio-legal-profile.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: bundlePath,
    external: ["*.node", "pg-native", "@clerk/express", "express"],
    banner: {
      js: "import { createRequire as createNodeRequire } from 'node:module'; globalThis.require = createNodeRequire(import.meta.url);",
    },
    logLevel: "silent",
  });
  ({ createStudioLegalProfileRouter } = await import(
    pathToFileURL(bundlePath).href
  ));
} catch (error) {
  await rm(buildDirectory, { recursive: true, force: true });
  throw error;
}

after(async () => {
  await rm(buildDirectory, { recursive: true, force: true });
});

function createHarness() {
  let savedProfile;
  const repository = {
    async find() {
      return savedProfile;
    },
    async save(userId, profile) {
      if (savedProfile && savedProfile.ownerUserId !== userId) return undefined;
      savedProfile = {
        profileKey: "default",
        ownerUserId: userId,
        ...profile,
        updatedAt: new Date("2026-10-05T12:00:00.000Z"),
      };
      return savedProfile;
    },
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.log = { error() {}, warn() {} };
    next();
  });
  app.use(
    createStudioLegalProfileRouter({
      repository,
      resolveUserId: (req) => req.get("x-test-user"),
    }),
  );
  const server = app.listen(0);

  return {
    server,
    async start() {
      await once(server, "listening");
      const address = server.address();
      return `http://127.0.0.1:${address.port}`;
    },
  };
}

const sampleProfile = {
  registeredName: "Fieldnotes Creative Ltd",
  tradingName: "Fieldnotes Studio",
  country: "United Kingdom",
  registeredAddress: "1 Market Street, London",
  privacyEmail: "privacy@example.co.uk",
  website: "https://example.co.uk",
};

test("the public legal profile never exposes account ownership", async (t) => {
  const harness = createHarness();
  t.after(() => new Promise((resolve) => harness.server.close(resolve)));
  const baseUrl = await harness.start();

  const response = await fetch(`${baseUrl}/studio/legal-profile`);
  const profile = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(profile.registeredName, "");
  assert.equal(profile.updatedAt, null);
  assert.equal(profile.canEdit, false);
});

test("the first account to save manages the shared profile without exposing owner ID", async (t) => {
  const harness = createHarness();
  t.after(() => new Promise((resolve) => harness.server.close(resolve)));
  const baseUrl = await harness.start();

  const unauthorized = await fetch(`${baseUrl}/studio/legal-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sampleProfile),
  });
  assert.equal(unauthorized.status, 401);

  const saved = await fetch(`${baseUrl}/studio/legal-profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-test-user": "user-one",
    },
    body: JSON.stringify(sampleProfile),
  });
  const savedProfile = await saved.json();

  assert.equal(saved.status, 200);
  assert.equal(savedProfile.registeredName, sampleProfile.registeredName);
  assert.equal(savedProfile.isComplete, true);
  assert.equal(savedProfile.canEdit, true);
  assert.equal("ownerUserId" in savedProfile, false);

  const publicRead = await fetch(`${baseUrl}/studio/legal-profile`);
  const publicProfile = await publicRead.json();
  assert.equal(publicProfile.registeredName, sampleProfile.registeredName);
  assert.equal(publicProfile.canEdit, false);

  const otherAccountSave = await fetch(`${baseUrl}/studio/legal-profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-test-user": "user-two",
    },
    body: JSON.stringify({ ...sampleProfile, tradingName: "Changed Studio" }),
  });
  assert.equal(otherAccountSave.status, 403);
});
