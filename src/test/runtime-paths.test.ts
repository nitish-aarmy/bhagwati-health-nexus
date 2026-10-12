import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { resolveAppOutputRoot } = require("../../electron/runtime-paths.cjs");

describe("electron packaged runtime path resolution", () => {
  it("prefers the unpacked app.asar.unpacked output when the app is packaged", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bhagwati-health-nexus-"));
    const resourcesRoot = path.join(tempRoot, "resources");
    const appAsarUnpackedRoot = path.join(resourcesRoot, "app.asar.unpacked");
    const appAsarRoot = path.join(resourcesRoot, "app.asar");
    const distRoot = path.join(appAsarUnpackedRoot, "dist-electron");

    fs.mkdirSync(path.join(distRoot, "server"), { recursive: true });
    fs.mkdirSync(path.join(appAsarUnpackedRoot, "public"), { recursive: true });
    fs.mkdirSync(path.join(appAsarRoot, "dist-electron", "server"), { recursive: true });

    const resolved = resolveAppOutputRoot({
      appIsPackaged: true,
      projectRoot: tempRoot,
      resourcesPath: resourcesRoot,
      fsImpl: fs,
    });

    expect(resolved).toBe(appAsarUnpackedRoot);
  });

  it("passes the Cloudflare waitUntil context shape expected by the Nitro fetch handler", async () => {
    const serverModulePath = path.resolve(__dirname, "../../dist-electron/server/index.mjs");
    const serverModule = await import(`file://${serverModulePath}`);
    const fetchHandler = serverModule.default.fetch.bind(serverModule.default);
    const response = await fetchHandler(
      new Request("http://127.0.0.1/"),
      {
        ASSETS: {
          async fetch() {
            return new Response("asset fallback", { status: 404 });
          },
        },
      },
      { waitUntil() {} },
    );

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(500);
  });
});
