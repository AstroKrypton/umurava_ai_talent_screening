import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  return verifyAccessToken(token ?? null);
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 }),
    };
  }

  return { session, response: null };
}
