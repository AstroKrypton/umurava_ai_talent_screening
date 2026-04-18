import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME, createAccessToken, getAccessTokenCookieOptions, hashPassword } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      organisation?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim() || "";
    const organisation = body.organisation?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const password = body.password || "";

    if (!name || !organisation || !email || !password) {
      return NextResponse.json({ success: false, error: "All fields are required." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters." }, { status: 400 });
    }

    await connectToDatabase();

    const existingUser = await UserModel.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json({ success: false, error: "An account with this email already exists." }, { status: 400 });
    }

    const user = await UserModel.create({
      name,
      organisation,
      email,
      role: "recruiter",
      passwordHash: hashPassword(password),
    });

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
