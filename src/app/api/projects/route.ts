import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import {
  createProject,
  getProjects,
  validateProjectInput,
} from "@/lib/project-store";

export async function GET() {
  const projects = await getProjects();
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const input = validateProjectInput(payload);
    const project = await createProject(input);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
