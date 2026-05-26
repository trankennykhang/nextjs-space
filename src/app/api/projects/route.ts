import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "src/data/projects.json");

// Minimal fallback/seed data in case the file system is inaccessible
const defaultProjects = [
  {
    id: "proj-1",
    name: "ProjectSpace Tracker",
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
    const fileContent = await fs.readFile(DATA_FILE_PATH, "utf-8");
    const data = JSON.parse(fileContent);
    return NextResponse.json({ data, source: "fs" });
  } catch (error) {
    console.error("Failed to read projects from disk. Falling back to default:", error);
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
    
    // Write back to the local json file
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    return NextResponse.json({ success: true, source: "fs" });
  } catch (error) {
    console.error("Failed to write projects to disk:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      message: "Filesystem is read-only. Changes have been preserved in client local storage."
    }, { status: 500 });
  }
}
