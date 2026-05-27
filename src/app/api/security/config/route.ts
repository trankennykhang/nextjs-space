import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSecurityConfig, saveSecurityConfig, getClientIp } from "../helper";

// Helper function to check if request is authenticated
async function checkAuth(request: Request) {
  const clientIp = getClientIp(request);
  const config = await getSecurityConfig();

  // 1. IP check
  if (config.allowedIp && clientIp === config.allowedIp) {
    return true;
  }

  // 2. Cookie check
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("auth_password")?.value;
  if (authCookie && authCookie === config.defaultPassword) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  try {
    const isAuthed = await checkAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized access to security settings" }, { status: 401 });
    }

    const config = await getSecurityConfig();
    const clientIp = getClientIp(request);

    return NextResponse.json({
      allowedIp: config.allowedIp,
      defaultPassword: config.defaultPassword,
      clientIp
    });
  } catch (error) {
    console.error("Error fetching config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAuthed = await checkAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized update to security settings" }, { status: 401 });
    }

    const body = await request.json() as { allowedIp?: string; defaultPassword?: string };
    const { allowedIp, defaultPassword } = body;

    if (defaultPassword === undefined || defaultPassword.trim() === "") {
      return NextResponse.json({ error: "Default password cannot be empty" }, { status: 400 });
    }

    const config = await getSecurityConfig();
    
    // Update config values
    config.allowedIp = (allowedIp ?? "").trim();
    config.defaultPassword = defaultPassword.trim();

    const { savedToKv, savedToFs } = await saveSecurityConfig(config);

    // Also update cookie since password might have changed
    const cookieStore = await cookies();
    cookieStore.set("auth_password", config.defaultPassword, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return NextResponse.json({
      success: true,
      allowedIp: config.allowedIp,
      defaultPassword: config.defaultPassword,
      savedToKv,
      savedToFs
    });
  } catch (error) {
    console.error("Error saving config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
