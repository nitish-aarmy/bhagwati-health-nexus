import { readLocalDbSnapshot, resetLocalDb, writeLocalDbSnapshot } from "@/integrations/supabase/client";

type ImportResult = { ok: boolean; error?: string };

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function utf8Decode(value: ArrayBuffer): string {
  return new TextDecoder().decode(value);
}

function downloadText(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    utf8(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: 120000,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function downloadPlainBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadText(`bhagwati-backup-${timestamp}.json`, readLocalDbSnapshot());
}

export function importPlainBackup(snapshot: string): ImportResult {
  return writeLocalDbSnapshot(snapshot);
}

export function resetLocalDatabase() {
  resetLocalDb();
}

export async function downloadEncryptedBackup(passphrase: string): Promise<ImportResult> {
  if (!passphrase.trim()) return { ok: false, error: "Passphrase is required" };

  try {
    const payload = readLocalDbSnapshot();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      utf8(payload),
    );

    const backup = {
      v: 1,
      alg: "AES-GCM",
      kdf: "PBKDF2-SHA256",
      iterations: 120000,
      salt: toBase64(salt),
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(cipher)),
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText(
      `bhagwati-backup-encrypted-${timestamp}.json`,
      JSON.stringify(backup, null, 2),
    );

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to encrypt backup";
    return { ok: false, error: message };
  }
}

export async function importEncryptedBackup(
  encryptedJson: string,
  passphrase: string,
): Promise<ImportResult> {
  if (!passphrase.trim()) return { ok: false, error: "Passphrase is required" };

  try {
    const parsed = JSON.parse(encryptedJson) as {
      salt?: string;
      iv?: string;
      ciphertext?: string;
    };

    if (!parsed.salt || !parsed.iv || !parsed.ciphertext) {
      return { ok: false, error: "Invalid encrypted backup file" };
    }

    const salt = fromBase64(parsed.salt);
    const iv = fromBase64(parsed.iv);
    const cipher = fromBase64(parsed.ciphertext);
    const key = await deriveKey(passphrase, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipher,
    );

    const snapshot = utf8Decode(decrypted);
    return writeLocalDbSnapshot(snapshot);
  } catch {
    return { ok: false, error: "Failed to decrypt backup. Check passphrase and file." };
  }
}
