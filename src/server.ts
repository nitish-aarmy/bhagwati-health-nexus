import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function jsonResponse(status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return null;
}

async function handleSmsOtpRequest(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => null)) as
      | { mobile?: unknown; otp?: unknown }
      | null;

    const mobile = normalizePhone(body?.mobile);
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";

    if (!mobile || otp.length !== 6) {
      return jsonResponse(400, { ok: false, error: "Invalid mobile or OTP payload" });
    }

    const apiKey = process.env.FAST2SMS_API_KEY || process.env.VITE_FAST2SMS_API_KEY;
    if (!apiKey) {
      return jsonResponse(200, {
        ok: false,
        notConfigured: true,
        error: "FAST2SMS_API_KEY not configured",
      });
    }

    const sender = process.env.FAST2SMS_SENDER_ID || process.env.VITE_FAST2SMS_SENDER_ID || "BHHOSP";
    const messageTemplate =
      process.env.FAST2SMS_OTP_MESSAGE ||
      process.env.VITE_FAST2SMS_OTP_MESSAGE ||
      "Bhagwati Hospital OTP: {otp}. Valid for 10 minutes.";

    const message = messageTemplate.replace("{otp}", otp);

    const smsResponse = await fetch(FAST2SMS_URL, {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",
        sender_id: sender,
        message,
        language: "english",
        numbers: mobile,
      }),
    });

    const payload = (await smsResponse.json().catch(() => null)) as
      | { return?: boolean; message?: string[] }
      | null;

    if (!smsResponse.ok || payload?.return !== true) {
      const reason = payload?.message?.join(" | ") || `SMS provider HTTP ${smsResponse.status}`;
      return jsonResponse(502, { ok: false, error: reason });
    }

    return jsonResponse(200, { ok: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown server error";
    return jsonResponse(500, { ok: false, error: reason });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (request.method === "POST" && url.pathname === "/api/sms/otp") {
        return await handleSmsOtpRequest(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
