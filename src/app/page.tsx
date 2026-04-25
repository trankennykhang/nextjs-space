"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Project, ProjectStatus } from "@/types/project";

type ProjectForm = {
  name: string;
  description: string;
  progress: number;
  status: ProjectStatus;
};

type ProjectsResponse = {
  projects?: Project[];
};

type ErrorResponse = {
  error?: string;
};

const INITIAL_FORM: ProjectForm = {
  name: "",
  description: "",
  progress: 0,
  status: "planning",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  paused: "Paused",
  done: "Done",
};

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<ProjectForm>(INITIAL_FORM);
  const [adminKey, setAdminKey] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const totalProgress = useMemo(() => {
    if (projects.length === 0) return 0;
    return Math.round(
      projects.reduce((sum, project) => sum + project.progress, 0) /
        projects.length,
    );
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (statusFilter === "all") return projects;
    return projects.filter((project) => project.status === statusFilter);
  }, [projects, statusFilter]);

  async function loadProjects() {
    try {
      setLoading(true);
      const response = await fetch("/api/projects");
      const data = (await response.json()) as ProjectsResponse;
      setProjects(data.projects ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  function startEdit(project: Project) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      description: project.description,
      progress: project.progress,
      status: project.status,
    });
  }

  function clearForm() {
    setEditingId(null);
    setForm(INITIAL_FORM);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      const endpoint = editingId ? `/api/projects/${editingId}` : "/api/projects";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as ErrorResponse;
      if (!response.ok) {
        setErrorMessage(payload.error ?? "Unable to save project");
        return;
      }

      await loadProjects();
      clearForm();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setErrorMessage("");
    const response = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
      headers: {
        "x-admin-key": adminKey,
      },
    });
    const payload = (await response.json()) as ErrorResponse;
    if (!response.ok) {
      setErrorMessage(payload.error ?? "Unable to delete project");
      return;
    }
    await loadProjects();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg">
          <p className="text-sm text-slate-300">Personal Dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold">What I am building now</h1>
          <p className="mt-2 text-slate-300">
            A single page overview of active projects with progress and status.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Total Projects" value={String(projects.length)} />
            <StatCard label="Average Progress" value={`${totalProgress}%`} />
            <StatCard
              label="Completed"
              value={String(projects.filter((p) => p.status === "done").length)}
            />
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-medium">Projects</h2>
            <select
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | ProjectStatus)
              }
            >
              <option value="all">All statuses</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-700 text-slate-300">
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Description</th>
                  <th className="px-3 py-3 font-medium">Progress</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                  {isAdmin && <th className="px-3 py-3 font-medium">Action</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-3 py-8 text-center">
                      Loading projects...
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-3 py-8 text-center">
                      No project found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => (
                    <tr key={project.id} className="border-b border-slate-800">
                      <td className="px-3 py-4 font-medium">{project.name}</td>
                      <td className="px-3 py-4 text-slate-300">
                        {project.description}
                      </td>
                      <td className="px-3 py-4">
                        <div className="w-44">
                          <div className="mb-1 flex justify-between text-xs text-slate-300">
                            <span>{project.progress}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800">
                            <div
                              className="h-2 rounded-full bg-cyan-400"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className="rounded-full bg-slate-800 px-2 py-1 text-xs">
                          {STATUS_LABEL[project.status]}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-slate-300">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-4">
                          <div className="flex gap-2">
                            <button
                              className="rounded-lg border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
                              onClick={() => startEdit(project)}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-lg border border-rose-500 px-3 py-1 text-sm text-rose-300 hover:bg-rose-950"
                              onClick={() => void handleDelete(project.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-medium">Admin</h2>
            {isAdmin && (
              <button
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
                onClick={() => {
                  setIsAdmin(false);
                  setAdminKey("");
                  clearForm();
                }}
                type="button"
              >
                Logout
              </button>
            )}
          </div>

          {!isAdmin ? (
            <div className="max-w-md space-y-3">
              <p className="text-sm text-slate-300">
                Enter admin key to manage projects.
              </p>
              <input
                type="password"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                placeholder="Admin key"
              />
              <button
                className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 hover:bg-cyan-400"
                onClick={() => setIsAdmin(Boolean(adminKey))}
                type="button"
              >
                Enter Admin Mode
              </button>
            </div>
          ) : (
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submitForm}>
              <label className="text-sm">
                Project name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="text-sm">
                Status
                <select
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      status: event.target.value as ProjectStatus,
                    }))
                  }
                >
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="paused">Paused</option>
                  <option value="done">Done</option>
                </select>
              </label>
              <label className="text-sm md:col-span-2">
                Description
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={3}
                  required
                />
              </label>
              <label className="text-sm">
                Progress ({form.progress}%)
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      progress: Number(event.target.value),
                    }))
                  }
                  className="mt-2 w-full"
                />
              </label>

              <div className="flex items-end gap-2">
                <button
                  className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {editingId ? "Update Project" : "Create Project"}
                </button>
                {editingId && (
                  <button
                    className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800"
                    onClick={clearForm}
                    type="button"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
          {errorMessage && <p className="mt-3 text-sm text-rose-300">{errorMessage}</p>}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
