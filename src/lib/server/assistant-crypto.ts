import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { serverEnv } from "@/lib/server/env";

const ALGORITHM = "aes-256-gcm";

export type EncryptedString = {
  algorithm: typeof ALGORITHM;
  iv: string;
  tag: string;
  value: string;
};

function getKey() {
  const rawKey = serverEnv.MONGODB_ENCRYPTION_KEY;
  if (!rawKey) return null;
  return createHash("sha256").update(rawKey).digest();
}

export function encryptSensitiveText(value: string): EncryptedString | null {
  const key = getKey();
  if (!key) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return {
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    value: encrypted.toString("base64"),
  };
}

export function decryptSensitiveText(encrypted: EncryptedString) {
  const key = getKey();
  if (!key) return null;

  const decipher = createDecipheriv(
    encrypted.algorithm,
    key,
    Buffer.from(encrypted.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.value, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
