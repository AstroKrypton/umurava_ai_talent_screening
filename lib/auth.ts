import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/auth-constants";

export { ACCESS_TOKEN_COOKIE_NAME };

export type AccessTokenPayload = {
  sub: string;
  email: string;
  name: string;
  organisation: string;
  role: string;
};

const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = "7d";
const BCRYPT_ROUNDS = 12;

function getAccessTokenSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set and at least 16 characters long");
  }

  return secret;
}

export function hashPassword(password: string) {
  const salt = bcrypt.genSaltSync(BCRYPT_ROUNDS);
  return bcrypt.hashSync(password, salt);
}

export function isLegacyPasswordHash(hash: string) {
  return hash.includes(":");
}

export function verifyPassword(password: string, storedHash: string) {
  if (isLegacyPasswordHash(storedHash)) {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;

    const candidate = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(originalHash, "hex"));
  }

  return bcrypt.compareSync(password, storedHash);
}

export function createAccessToken(payload: AccessTokenPayload) {
  const expiresIn = process.env.JWT_EXPIRE ?? DEFAULT_ACCESS_TOKEN_EXPIRES_IN;
  const options = { expiresIn } as SignOptions;

  return jwt.sign(payload as object, getAccessTokenSecret(), options);
}

export function verifyAccessToken(token: string | null | undefined) {
  if (!token) return null;

  try {
    return jwt.verify(token, getAccessTokenSecret()) as AccessTokenPayload & {
      iat: number;
      exp: number;
    };
  } catch {
    return null;
  }
}

export function getAccessTokenCookieOptions() {
  const expiresIn = process.env.JWT_EXPIRE ?? DEFAULT_ACCESS_TOKEN_EXPIRES_IN;
  const maxAgeSeconds = (() => {
    const match = /^([0-9]+)d$/.exec(expiresIn);
    if (match) return Number.parseInt(match[1], 10) * 24 * 60 * 60;

    const hours = /^([0-9]+)h$/.exec(expiresIn);
    if (hours) return Number.parseInt(hours[1], 10) * 60 * 60;

    const minutes = /^([0-9]+)m$/.exec(expiresIn);
    if (minutes) return Number.parseInt(minutes[1], 10) * 60;

    // fallback to 7 days
    return 7 * 24 * 60 * 60;
  })();

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
