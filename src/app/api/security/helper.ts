import { getCloudflareContext } from "@opennextjs/cloudflare";
import fs from "fs/promises";
import path from "path";

const CONFIG_FILE_PATH = path.join(process.cwd(), "src/data/security_config.json");

export interface SecurityConfig {
  allowedIp: string;
  defaultPassword: string;
}

interface SecurityKV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
}

export async function getSecurityConfig(): Promise<SecurityConfig> {
  try {
    // 1. Try KV Namespace
    try {
      const context = getCloudflareContext();
      const env = context.env as { PROJECTS_KV?: SecurityKV };
      if (env.PROJECTS_KV) {
        const dataStr = await env.PROJECTS_KV.get("security_config");
        if (dataStr) {
          return JSON.parse(dataStr);
        }
      }
    } catch (kvError) {
      console.warn("KV is not accessible for security config, using local filesystem:", kvError);
    }

    // 2. Try Local Filesystem
    const fileContent = await fs.readFile(CONFIG_FILE_PATH, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Failed to read security configuration. Returning defaults:", error);
    return { allowedIp: "", defaultPassword: "admin" };
  }
}

export async function saveSecurityConfig(config: SecurityConfig): Promise<{ savedToKv: boolean; savedToFs: boolean }> {
  let savedToKv = false;
  let savedToFs = false;

  // 1. Try KV Namespace
  try {
    const context = getCloudflareContext();
    const env = context.env as { PROJECTS_KV?: SecurityKV };
    if (env.PROJECTS_KV) {
      await env.PROJECTS_KV.put("security_config", JSON.stringify(config));
      savedToKv = true;
    }
  } catch (kvError) {
    console.warn("Could not save security config to Cloudflare KV:", kvError);
  }

  // 2. Try Local Filesystem
  try {
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), "utf-8");
    savedToFs = true;
  } catch (fsError) {
    console.warn("Could not write security config to filesystem:", fsError);
  }

  return { savedToKv, savedToFs };
}

export function getClientIp(request: Request): string {
  let ip = request.headers.get("cf-connecting-ip") ||
           request.headers.get("x-forwarded-for") ||
           request.headers.get("x-real-ip") ||
           "127.0.0.1";

  // If x-forwarded-for contains proxies, split and take the first IP
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  // Normalize IPv6 local loopbacks
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    ip = "127.0.0.1";
  }

  return ip;
}
