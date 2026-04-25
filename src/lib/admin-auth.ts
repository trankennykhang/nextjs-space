import { NextRequest } from "next/server";

export function isAuthorizedAdmin(req: NextRequest): boolean {
  const configuredKey = process.env.ADMIN_KEY ?? "admin123";
  const requestKey = req.headers.get("x-admin-key");
  return requestKey === configuredKey;
}
