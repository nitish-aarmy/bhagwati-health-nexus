// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

import { handleSmsOtpPayload } from "./src/lib/sms-otp.ts";

const devSmsOtpPlugin = (): Plugin => ({
  name: "dev-sms-otp-route",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.method !== "POST" || req.url !== "/api/sms/otp") {
        return next();
      }

      const rawBody = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        req.on("error", reject);
      });

      const requestBody = rawBody ? JSON.parse(rawBody) : {};
      const response = await handleSmsOtpPayload(requestBody, process.env);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.end(await response.text());
    });
  },
});

export default defineConfig({
  vite: {
    server: {
      // Required for dynamic tunnel domains (localhost.run/localtunnel/etc.) in development.
      allowedHosts: true,
    },
    plugins: [devSmsOtpPlugin()],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
