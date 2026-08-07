type SmsResult = { ok: true } | { ok: false; error: string; notConfigured?: boolean };

const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

export async function sendOtpViaFast2Sms(mobile: string, otp: string): Promise<SmsResult> {
  const apiKey = import.meta.env.VITE_FAST2SMS_API_KEY as string | undefined;
  if (!apiKey) {
    return {
      ok: false,
      notConfigured: true,
      error: "Fast2SMS API key is not configured",
    };
  }

  const sender = (import.meta.env.VITE_FAST2SMS_SENDER_ID as string | undefined) ?? "BHHOSP";
  const message =
    (import.meta.env.VITE_FAST2SMS_OTP_MESSAGE as string | undefined) ??
    `Bhagwati Hospital OTP: ${otp}. Valid for 10 minutes.`;

  try {
    const response = await fetch(FAST2SMS_URL, {
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

    const payload = (await response.json().catch(() => null)) as
      | { return?: boolean; message?: string[]; request_id?: string }
      | null;

    if (!response.ok || payload?.return !== true) {
      const reason = payload?.message?.join(" | ") || `SMS provider HTTP ${response.status}`;
      return { ok: false, error: reason };
    }

    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown SMS provider error";
    return { ok: false, error: reason };
  }
}
