import { promises as fs } from "node:fs";
import path from "node:path";
import { Project, ProjectStatus } from "@/types/project";

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_PATH = path.join(DATA_DIR, "projects.json");

type ProjectInput = {
  name: string;
  description: string;
  progress: number;
  status: ProjectStatus;
};

const VALID_STATUS: ProjectStatus[] = [
  "planning",
  "in_progress",
  "paused",
  "done",
];

export function validateProjectInput(data: unknown): ProjectInput {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid request body");
  }

  const payload = data as Record<string, unknown>;
  const name = String(payload.name ?? "").trim();
  const description = String(payload.description ?? "").trim();
  const progress = Number(payload.progress);
  const status = payload.status as ProjectStatus;

  if (name.length < 2 || name.length > 80) {
    throw new Error("Name must be between 2 and 80 characters");
  }
  if (description.length < 5 || description.length > 240) {
    throw new Error("Description must be between 5 and 240 characters");
  }
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    throw new Error("Progress must be a number between 0 and 100");
  }
  if (!VALID_STATUS.includes(status)) {
    throw new Error("Invalid status");
  }

  return {
    name,
    description,
    progress: Math.round(progress),
    status,
  };
}

async function ensureStoreExists(): Promise<void> {
  try {
    await fs.access(PROJECTS_PATH);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const seed: Project[] = [
      {
        id: crypto.randomUUID(),
        name: "Personal Portfolio v2",
        description: "Redesigning personal profile and case studies section.",
        progress: 65,
        status: "in_progress",
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: "Habit Tracker API",
        description: "Building a tiny API for tracking daily writing habits.",
        progress: 35,
        status: "planning",
        updatedAt: new Date().toISOString(),
      },
    ];
    await fs.writeFile(PROJECTS_PATH, JSON.stringify(seed, null, 2), "utf-8");
  }
}

export async function getProjects(): Promise<Project[]> {
  await ensureStoreExists();
  const content = await fs.readFile(PROJECTS_PATH, "utf-8");
  const projects = JSON.parse(content) as Project[];
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROJECTS_PATH, JSON.stringify(projects, null, 2), "utf-8");
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const projects = await getProjects();
  const newProject: Project = {
    id: crypto.randomUUID(),
    ...input,
    updatedAt: new Date().toISOString(),
  };
  projects.push(newProject);
  await saveProjects(projects);
  return newProject;
}

export async function updateProject(
  id: string,
  input: ProjectInput,
): Promise<Project | null> {
  const projects = await getProjects();
  const index = projects.findIndex((project) => project.id === id);
  if (index < 0) {
    return null;
  }

  projects[index] = {
    ...projects[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };

  await saveProjects(projects);
  return projects[index];
}

export async function deleteProject(id: string): Promise<boolean> {
  const projects = await getProjects();
  const nextProjects = projects.filter((project) => project.id !== id);
  if (nextProjects.length === projects.length) {
    return false;
  }
  await saveProjects(nextProjects);
  return true;
}
