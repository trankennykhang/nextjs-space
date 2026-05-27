import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSecurityConfig, getClientIp } from "../helper";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { password?: string };
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const config = await getSecurityConfig();
    const clientIp = getClientIp(request);

    if (password === config.defaultPassword) {
      const cookieStore = await cookies();
      cookieStore.set("auth_password", password, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: "lax",
        // Secure flag can be true in production, but let's keep it relaxed for local dev
      });

      return NextResponse.json({ success: true, clientIp });
    }

    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  } catch (error) {
    console.error("Error in login endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
