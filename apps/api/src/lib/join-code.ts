import { randomBytes } from "node:crypto";

export const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export const generateJoinCode = (length = 8) => {
  const bytes = randomBytes(length);
  return Array.from(
    bytes,
    (b) => JOIN_CODE_ALPHABET[b % JOIN_CODE_ALPHABET.length],
  ).join("");
};
