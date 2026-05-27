import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSecurityConfig, getClientIp } from "../helper";

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const config = await getSecurityConfig();

    // 1. IP check: Check if client IP matches allowed IP
    if (config.allowedIp && clientIp === config.allowedIp) {
      return NextResponse.json({
        authenticated: true,
        clientIp,
        mode: "ip"
      });
    }

    // 2. Cookie check: Check if cookie matches default password
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth_password")?.value;
    if (authCookie && authCookie === config.defaultPassword) {
      return NextResponse.json({
        authenticated: true,
        clientIp,
        mode: "password"
      });
    }

    // Otherwise, not authorized
    return NextResponse.json({
      authenticated: false,
      clientIp,
      mode: null
    });
  } catch (error) {
    console.error("Error in security check endpoint:", error);
    return NextResponse.json({
      authenticated: false,
      clientIp: "unknown",
      mode: null,
      error: String(error)
    }, { status: 500 });
  }
}
