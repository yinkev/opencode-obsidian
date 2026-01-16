import { createHash, randomBytes } from "crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function randomIdHex(bytes: number = 16): string {
  return randomBytes(bytes).toString("hex");
}
