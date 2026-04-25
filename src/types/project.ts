export type ProjectStatus = "planning" | "in_progress" | "paused" | "done";

export type Project = {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: ProjectStatus;
  updatedAt: string;
};
