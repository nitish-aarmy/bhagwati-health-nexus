const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return null;
}

function jsonResponse(status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function buildSmsOtpResponse(
  body: { mobile?: unknown; otp?: unknown } | null | undefined,
  env: Record<string, string | undefined> = (typeof process !== "undefined" ? process.env : {}) as Record<
    string,
    string | undefined
  >,
): { status: number; body: Record<string, unknown> } {
  const mobile = normalizePhone(body?.mobile);
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";

  if (!mobile || otp.length !== 6) {
    return {
      status: 400,
      body: { ok: false, error: "Invalid mobile or OTP payload" },
    };
  }

  const apiKey = env.FAST2SMS_API_KEY || env.VITE_FAST2SMS_API_KEY;
  if (!apiKey) {
    return {
      status: 200,
      body: {
        ok: false,
        notConfigured: true,
        error: "FAST2SMS_API_KEY not configured",
      },
    };
  }

  return {
    status: 200,
    body: { ok: true, notConfigured: false, mobile, otp },
  };
}

export async function handleSmsOtpPayload(
  body: unknown,
  env: Record<string, string | undefined> = (typeof process !== "undefined" ? process.env : {}) as Record<
    string,
    string | undefined
  >,
): Promise<Response> {
  try {
    const payload = body as { mobile?: unknown; otp?: unknown } | null;
    const validation = buildSmsOtpResponse(payload, env);
    if (validation.status !== 200) {
      return jsonResponse(validation.status, validation.body);
    }

    const apiKey = env.FAST2SMS_API_KEY || env.VITE_FAST2SMS_API_KEY;
    if (!apiKey || env.NODE_ENV === "development") {
      return jsonResponse(200, {
        ok: false,
        notConfigured: true,
        error: env.NODE_ENV === "development"
          ? "FAST2SMS API is disabled in local development. Set FAST2SMS_API_KEY to send live OTPs."
          : "FAST2SMS_API_KEY not configured",
      });
    }

    const sender = env.FAST2SMS_SENDER_ID || env.VITE_FAST2SMS_SENDER_ID || "BHHOSP";
    const messageTemplate =
      env.FAST2SMS_OTP_MESSAGE ||
      env.VITE_FAST2SMS_OTP_MESSAGE ||
      "Bhagwati Hospital OTP: {otp}. Valid for 10 minutes.";
    const mobile = normalizePhone(payload?.mobile);
    const otp = typeof payload?.otp === "string" ? payload.otp.trim() : "";
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

    const providerPayload = (await smsResponse.json().catch(() => null)) as
      | { return?: boolean; message?: string[] }
      | null;

    if (!smsResponse.ok || providerPayload?.return !== true) {
      const reason = providerPayload?.message?.join(" | ") || `SMS provider HTTP ${smsResponse.status}`;
      return jsonResponse(502, { ok: false, error: reason });
    }

    return jsonResponse(200, { ok: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown server error";
    return jsonResponse(500, { ok: false, error: reason });
  }
}

export async function handleSmsOtpRequest(request: Request): Promise<Response> {
  return handleSmsOtpPayload(await request.json().catch(() => null), process.env);
}
