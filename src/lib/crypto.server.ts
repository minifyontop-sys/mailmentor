import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const SALT = "mailmentor-v1";

function deriveKey(secret: string): Buffer {
  // 32-byte key derived from AUTH_SECRET. scryptSync is intentionally
  // expensive so a leaked DB doesn't trivially recover tokens.
  return scryptSync(secret, SALT, 32);
}

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set it in .env.local to a random 32+ char string."
    );
  }
  return deriveKey(secret);
}

/**
 * Encrypts a plaintext token for storage in the DB. The output is
 * `<iv-hex>:<tag-hex>:<ciphertext-hex>` — all hex-encoded so it survives
 * any text column. Returns "" for empty input.
 */
export function encryptToken(plaintext: string | null | undefined): string {
  if (!plaintext) return "";
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

/**
 * Decrypts a token previously encrypted with `encryptToken`. Returns "" for
 * empty input. Throws if the ciphertext is malformed or the tag fails
 * verification (which means tampering or a key change).
 */
export function decryptToken(ciphertext: string | null | undefined): string {
  if (!ciphertext) return "";
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Encrypted token is malformed.");
  }
  const [ivHex, tagHex, encHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf-8");
}
