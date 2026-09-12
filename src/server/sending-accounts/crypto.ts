import "server-only";

import crypto from "node:crypto";

// AES-256-GCM at-rest encryption for user secrets (Resend keys, OAuth tokens
// once Gmail/Outlook land). APP_ENCRYPTION_KEY must be 32 bytes, base64:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

const RAW = process.env.APP_ENCRYPTION_KEY ?? "";

function keyBuf(): Buffer {
  const buf = Buffer.from(RAW, "base64");
  if (buf.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes, base64-encoded (see .env.local.example)");
  }
  return buf;
}

export const hasEncryptionKey = (() => {
  try {
    keyBuf();
    return true;
  } catch {
    return false;
  }
})();

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(blob: string): string {
  const raw = Buffer.from(blob, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
