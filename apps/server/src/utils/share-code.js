import crypto from "node:crypto";

const SHARE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHARE_CODE_LENGTH = 6;

export function generateShareCode() {
  let shareCode = "";

  for (let index = 0; index < SHARE_CODE_LENGTH; index += 1) {
    const randomIndex = crypto.randomInt(0, SHARE_CODE_ALPHABET.length);
    shareCode += SHARE_CODE_ALPHABET[randomIndex];
  }

  return shareCode;
}

