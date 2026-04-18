import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME, createAccessToken, getAccessTokenCookieOptions, hashPassword, isLegacyPasswordHash, verifyPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ success: false, error: "Email and password are required." }, { status: 400 });
  }

  await connectToDatabase();
  const user = await UserModel.findOne({ email });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
  }

  if (isLegacyPasswordHash(user.passwordHash)) {
    user.passwordHash = hashPassword(password);
    await user.save();
  }

  const response = NextResponse.json({
    success: true,
    data: {
      id: String(user._id),
      name: user.name,
      organisation: user.organisation,
      email: user.email,
      role: user.role,
    },
  });

  response.cookies.set(
    ACCESS_TOKEN_COOKIE_NAME,
    createAccessToken({
      sub: String(user._id),
      email: user.email,
      name: user.name,
      organisation: user.organisation,
      role: user.role,
    }),
    getAccessTokenCookieOptions(),
  );

  return response;
}
