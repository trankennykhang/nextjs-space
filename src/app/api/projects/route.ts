import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const DATA_FILE_PATH = path.join(process.cwd(), "src/data/projects.json");

// Define KV namespace interface for TypeScript typing
interface ProjectsKV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
}

// Minimal fallback/seed data in case both the KV database and filesystem are inaccessible
const defaultProjects = [
  {
    id: "proj-1",
    name: "Project Space Tracker",
    description: "Building a premium, highly interactive personal dashboard to track project developments and milestones.",
    status: "Active",
    createdAt: "2026-05-26",
    location: "Local Dev",
    activities: [
      {
        id: "act-1",
        date: "2026-05-26",
        description: "Designed glassmorphic card layouts and configured dark theme."
      }
    ]
  }
];

export async function GET() {
  try {
    // 1. Try to read from Cloudflare KV Namespace (Production / Deployed Worker)
    try {
      const context = getCloudflareContext();
      const env = context.env as { PROJECTS_KV?: ProjectsKV };
      if (env.PROJECTS_KV) {
        const kvDataString = await env.PROJECTS_KV.get("projects_data");
        if (kvDataString) {
          const data = JSON.parse(kvDataString);
          return NextResponse.json({ data, source: "kv" });
        }
      }
    } catch (kvError) {
      console.warn("Cloudflare KV is not configured or not accessible. Falling back to local filesystem:", kvError);
    }

    // 2. Fallback to local filesystem (Development / Local preview)
    const fileContent = await fs.readFile(DATA_FILE_PATH, "utf-8");
    const data = JSON.parse(fileContent);
    return NextResponse.json({ data, source: "fs" });
  } catch (error) {
    console.error("Failed to read projects from disk or KV. Falling back to default seed:", error);
    return NextResponse.json({ 
      data: defaultProjects, 
      source: "fallback", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { data?: unknown };
    const data = body.data;
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid data format. Expected an array of projects." }, { status: 400 });
    }

    let savedToKv = false;
    let savedToFs = false;

    // 1. Try to save to Cloudflare KV Namespace (Production / Deployed Worker)
    try {
      const context = getCloudflareContext();
      const env = context.env as { PROJECTS_KV?: ProjectsKV };
      if (env.PROJECTS_KV) {
        await env.PROJECTS_KV.put("projects_data", JSON.stringify(data));
        savedToKv = true;
      }
    } catch (kvError) {
      console.warn("Could not save to Cloudflare KV edge namespace. Trying filesystem:", kvError);
    }

    // 2. Try to save to local filesystem (Succeeds in local dev, fails harmlessly in worker environment)
    try {
      await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
      savedToFs = true;
    } catch (fsError) {
      console.warn("Could not write to local filesystem (this is expected in read-only Worker environments):", fsError);
    }

    // Respond with appropriate source status
    if (savedToKv) {
      return NextResponse.json({ success: true, source: "kv" });
    } else if (savedToFs) {
      return NextResponse.json({ success: true, source: "fs" });
    } else {
      throw new Error("Unable to save data to KV or local file system.");
    }
  } catch (error) {
    console.error("Failed to save projects database:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      message: "Filesystem is read-only and Cloudflare KV is missing. Changes have been preserved in client local storage."
    }, { status: 500 });
  }
}
