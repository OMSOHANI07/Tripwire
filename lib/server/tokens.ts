import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Short, URL-friendly id for trips (no ambiguous characters). */
export function newTripId(length = 10): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Unguessable secret for organizer keys and personal edit tokens. */
export function newSecret(): string {
  return randomBytes(24).toString("base64url");
}

/** Only hashes of secrets are stored in the database. */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
