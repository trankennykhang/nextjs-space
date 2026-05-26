"use client";

import { useState, useEffect } from "react";

interface Activity {
  id: string;
  date: string;
  description: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Planning" | "Completed" | "On Hold";
  createdAt: string;
  location: string;
  activities: Activity[];
}

export default function Home() {
  // State variables
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "local-only" | "error">("synced");

  // Form states for creating a new project
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjLocation, setNewProjLocation] = useState("");
  const [newProjStatus, setNewProjStatus] = useState<Project["status"]>("Active");

  // Form states for updating an existing project
  const [showUpdateProjectModal, setShowUpdateProjectModal] = useState(false);
  const [updateProjName, setUpdateProjName] = useState("");
  const [updateProjDesc, setUpdateProjDesc] = useState("");
  const [updateProjLocation, setUpdateProjLocation] = useState("");

  // Form states for logging an activity
  const [newActivityDesc, setNewActivityDesc] = useState("");
  const [newActivityDate, setNewActivityDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Load projects from API & LocalStorage
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/projects");
        const json = (await res.json()) as { data?: Project[]; source?: string; error?: string };
        
        // Check if there is already a saved state in localStorage
        const localSaved = localStorage.getItem("projectspace_data");
        if (localSaved) {
          const parsedLocal = JSON.parse(localSaved);
          // If local storage has different or newer data, use it, otherwise sync from API
          // For safety in this personal app, if both exist, we merge or default to localStorage
          setProjects(parsedLocal);
          setSyncStatus("local-only");
          if (parsedLocal.length > 0) {
            setSelectedProjectId(parsedLocal[0].id);
          }
        } else if (json.data) {
          setProjects(json.data);
          localStorage.setItem("projectspace_data", JSON.stringify(json.data));
          setSyncStatus(json.source === "fs" ? "synced" : "local-only");
          if (json.data.length > 0) {
            setSelectedProjectId(json.data[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading projects:", error);
        setSyncStatus("error");
        // Try fallback to local storage
        const localSaved = localStorage.getItem("projectspace_data");
        if (localSaved) {
          const parsedLocal = JSON.parse(localSaved);
          setProjects(parsedLocal);
          if (parsedLocal.length > 0) {
            setSelectedProjectId(parsedLocal[0].id);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Save data to server API & LocalStorage
  const saveData = async (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    localStorage.setItem("projectspace_data", JSON.stringify(updatedProjects));
    
    setSyncStatus("saving");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedProjects }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) {
        setSyncStatus("synced");
      } else {
        setSyncStatus("local-only"); // Read-only fallback
      }
    } catch (error) {
      console.error("Failed to sync to database file, using local storage:", error);
      setSyncStatus("local-only");
    }
  };

  // Add new project handler
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: newProjName.trim(),
      description: newProjDesc.trim(),
      status: newProjStatus,
      createdAt: new Date().toISOString().split("T")[0],
      location: newProjLocation.trim() || "Remote",
      activities: [
        {
          id: `act-${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          description: "Project initialized.",
        },
      ],
    };

    const updated = [newProject, ...projects];
    saveData(updated);
    setSelectedProjectId(newProject.id);

    // Reset fields
    setNewProjName("");
    setNewProjDesc("");
    setNewProjLocation("");
    setNewProjStatus("Active");
    setShowAddProjectModal(false);
  };

  // Open update project modal handler
  const openUpdateModal = () => {
    if (!activeProject) return;
    setUpdateProjName(activeProject.name);
    setUpdateProjDesc(activeProject.description);
    setUpdateProjLocation(activeProject.location || "");
    setShowUpdateProjectModal(true);
  };

  // Update existing project handler
  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !updateProjName.trim()) return;

    const updated = projects.map((p) => {
      if (p.id === activeProject.id) {
        return {
          ...p,
          name: updateProjName.trim(),
          description: updateProjDesc.trim(),
          location: updateProjLocation.trim() || "Remote",
        };
      }
      return p;
    });

    saveData(updated);
    setShowUpdateProjectModal(false);
  };

  // Add new activity log handler
  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newActivityDesc.trim()) return;

    const updated = projects.map((p) => {
      if (p.id === selectedProjectId) {
        const newAct: Activity = {
          id: `act-${Date.now()}`,
          date: newActivityDate || new Date().toISOString().split("T")[0],
          description: newActivityDesc.trim(),
        };
        return {
          ...p,
          activities: [newAct, ...p.activities], // Newest activities first
        };
      }
      return p;
    });

    saveData(updated);
    setNewActivityDesc("");
  };

  // Update project status directly
  const handleUpdateStatus = (projId: string, status: Project["status"]) => {
    const updated = projects.map((p) => {
      if (p.id === projId) {
        return { ...p, status };
      }
      return p;
    });
    saveData(updated);
  };

  // Delete project handler
  const handleDeleteProject = (projId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const updated = projects.filter((p) => p.id !== projId);
    saveData(updated);
    if (selectedProjectId === projId) {
      setSelectedProjectId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Delete activity handler
  const handleDeleteActivity = (projId: string, actId: string) => {
    const updated = projects.map((p) => {
      if (p.id === projId) {
        return {
          ...p,
          activities: p.activities.filter((a) => a.id !== actId),
        };
      }
      return p;
    });
    saveData(updated);
  };

  // Find currently selected project
  const activeProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Filter projects by Search Query & Status Filter
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate status counts
  const totalCount = projects.length;
  const activeCount = projects.filter((p) => p.status === "Active").length;
  const planningCount = projects.filter((p) => p.status === "Planning").length;
  const completedCount = projects.filter((p) => p.status === "Completed").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-zinc-200 to-indigo-300">
              ProjectSpace
            </h1>
            <p className="text-xs text-zinc-500 font-medium">Personal Development Lab</p>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2">
          {syncStatus === "synced" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Synced with JSON
            </span>
          )}
          {syncStatus === "saving" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
              Saving...
            </span>
          )}
          {syncStatus === "local-only" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Changes are saved locally in the browser. Perfect for read-only serverless worker deployment.">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Client Storage Active
            </span>
          )}
          {syncStatus === "error" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
              Connection Error
            </span>
          )}
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Sidebar list */}
        <aside className="w-full md:w-[450px] border-r border-zinc-900 bg-zinc-950/40 flex flex-col shrink-0">
          
          {/* Quick Statistics Banner */}
          <div className="p-4 grid grid-cols-4 gap-2 border-b border-zinc-900/60 bg-zinc-950/20">
            <button
              onClick={() => setStatusFilter("All")}
              className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                statusFilter === "All"
                  ? "bg-zinc-800/80 text-zinc-100"
                  : "hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="text-lg font-bold">{totalCount}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider">All</span>
            </button>
            <button
              onClick={() => setStatusFilter("Active")}
              className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                statusFilter === "Active"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="text-lg font-bold">{activeCount}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider">Active</span>
            </button>
            <button
              onClick={() => setStatusFilter("Planning")}
              className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                statusFilter === "Planning"
                  ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                  : "hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="text-lg font-bold">{planningCount}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider">Plan</span>
            </button>
            <button
              onClick={() => setStatusFilter("Completed")}
              className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                statusFilter === "Completed"
                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                  : "hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="text-lg font-bold">{completedCount}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider">Done</span>
            </button>
          </div>

          {/* Search Bar & Action Buttons */}
          <div className="p-4 flex flex-col gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/70 border border-zinc-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none"
              />
            </div>
            
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/15 active:scale-[0.98] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Create New Project
            </button>
          </div>

          {/* Projects List Container */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2.5 scrollbar-thin scrollbar-thumb-zinc-800">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-3">
                <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-sm font-medium">Analyzing database...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-16 text-center text-zinc-500">
                <svg className="w-10 h-10 mx-auto text-zinc-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4.5m12+3.5h.01" />
                </svg>
                <p className="text-sm font-semibold">No projects found</p>
                <p className="text-xs text-zinc-600 mt-1">Try creating a new one or adjusting filters.</p>
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isActive = p.id === selectedProjectId;
                const statusDotColors = {
                  Active: "bg-emerald-400 ring-emerald-500/30",
                  Planning: "bg-sky-400 ring-sky-500/30",
                  Completed: "bg-indigo-400 ring-indigo-500/30",
                  "On Hold": "bg-amber-400 ring-amber-500/30",
                };
                const activeLabelColor = {
                  Active: "text-emerald-400 bg-emerald-500/10",
                  Planning: "text-sky-400 bg-sky-500/10",
                  Completed: "text-indigo-400 bg-indigo-500/10",
                  "On Hold": "text-amber-400 bg-amber-500/10",
                };

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 group relative overflow-hidden ${
                      isActive
                        ? "bg-indigo-950/20 border-indigo-500/40 shadow-inner shadow-indigo-500/5"
                        : "bg-zinc-900/30 border-zinc-900 hover:bg-zinc-900/60 hover:border-zinc-800"
                    }`}
                  >
                    {/* Left highlight strip for selected item */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-violet-500"></div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-semibold transition-colors truncate ${isActive ? "text-indigo-300" : "text-zinc-200 group-hover:text-zinc-100"}`} title={`${p.name} - ${p.location}`}>
                        {p.name} - {p.location || "Remote"}
                      </h3>
                      
                      {/* Status indicator dot */}
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${activeLabelColor[p.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDotColors[p.status]} ${p.status !== "Completed" ? "animate-pulse ring-2" : ""}`}></span>
                        {p.status}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {p.description || "No description provided."}
                    </p>

                    <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-500 font-semibold border-t border-zinc-900/60 pt-2">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {p.activities.length} logs
                      </span>
                      <span>
                        {p.activities[0]
                          ? `Last updated: ${p.activities[0].date}`
                          : `Created: ${p.createdAt}`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Side: Details & Activity Feed */}
        <main className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto min-w-0">
          {activeProject ? (
            <div className="p-6 max-w-4xl w-full mx-auto space-y-6">
              
              {/* Project Main Header Card */}
              <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/25 relative overflow-hidden backdrop-blur-sm">
                
                {/* Visual Accent */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-zinc-500">
                      <span>Created {activeProject.createdAt}</span>
                      <span>•</span>
                      <span className="text-indigo-400 font-mono">ID: {activeProject.id}</span>
                      {activeProject.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-zinc-400">
                            <svg className="w-3 h-3 text-zinc-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {activeProject.location}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
                      {activeProject.name} - {activeProject.location || "Remote"}
                    </h2>
                  </div>

                  {/* Actions Header Row */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Dropdown */}
                    <div className="relative">
                      <select
                        value={activeProject.status}
                        onChange={(e) =>
                          handleUpdateStatus(
                            activeProject.id,
                            e.target.value as Project["status"]
                          )
                        }
                        className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 font-bold outline-none cursor-pointer focus:border-indigo-500/50 appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23a1a1aa%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_0.75rem_center] bg-no-repeat transition-all"
                      >
                        <option value="Active">Active</option>
                        <option value="Planning">Planning</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={openUpdateModal}
                      className="p-1.5 rounded-xl border border-zinc-900 bg-zinc-950 text-zinc-500 hover:text-indigo-400 hover:border-indigo-900/30 hover:bg-indigo-500/5 transition-all"
                      title="Update Project Details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteProject(activeProject.id)}
                      className="p-1.5 rounded-xl border border-zinc-900 bg-zinc-950 text-zinc-500 hover:text-rose-400 hover:border-rose-900/30 hover:bg-rose-500/5 transition-all"
                      title="Delete Project"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <p className="text-zinc-300 text-sm leading-relaxed mt-4 bg-zinc-950/20 p-4 rounded-xl border border-zinc-900/60 font-medium">
                  {activeProject.description || "Add a description to summarize this project."}
                </p>
              </div>

              {/* Logger widget */}
              <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10">
                <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Log New Activity
                </h3>

                <form onSubmit={handleAddActivity} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="What progress did you make today?"
                      value={newActivityDesc}
                      onChange={(e) => setNewActivityDesc(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 outline-none transition-all"
                      required
                    />
                    
                    <input
                      type="date"
                      value={newActivityDate}
                      onChange={(e) => setNewActivityDate(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none focus:border-indigo-500/50 transition-all font-mono"
                    />

                    <button
                      type="submit"
                      className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-5 py-2 rounded-xl text-sm transition-all active:scale-[0.98]"
                    >
                      Log Entry
                    </button>
                  </div>
                </form>
              </div>

              {/* Vertical Activity History Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wider px-2">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activity History ({activeProject.activities.length})
                </h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-900">
                  {activeProject.activities.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600 text-xs font-medium">
                      No activities logged yet. Use the logger above to write your first status update.
                    </div>
                  ) : (
                    activeProject.activities.map((act) => (
                      <div key={act.id} className="relative group/timeline flex flex-col gap-1.5">
                        
                        {/* Timeline Circle indicator */}
                        <div className="absolute -left-[20px] top-1 w-3.5 h-3.5 rounded-full bg-zinc-950 border-2 border-indigo-500 group-hover/timeline:scale-125 transition-all"></div>
                        
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-semibold text-indigo-400 font-mono">
                            {act.date}
                          </span>

                          {/* Action - Delete Activity */}
                          <button
                            onClick={() => handleDeleteActivity(activeProject.id, act.id)}
                            className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover/timeline:opacity-100 transition-all text-xs"
                            title="Delete log entry"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        <div className="p-3.5 rounded-xl border border-zinc-900/60 bg-zinc-900/10 text-zinc-300 text-xs leading-relaxed font-medium">
                          {act.description}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-500 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shadow-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-zinc-300">Welcome to ProjectSpace</h3>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Create a new project or select an existing project from the sidebar to track its history.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modern Modal / Sheet to Add a New Project */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/20">
              <h3 className="text-base font-bold text-zinc-100">Create New Project</h3>
              <button
                onClick={() => setShowAddProjectModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddProject} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Portfolio v2"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm text-zinc-100 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Description
                </label>
                <textarea
                  placeholder="Briefly describe what you're building..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm text-zinc-100 min-h-[80px] outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Remote, Tokyo Office, Local Dev"
                  value={newProjLocation}
                  onChange={(e) => setNewProjLocation(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm text-zinc-100 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Initial Status
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["Active", "Planning", "On Hold", "Completed"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewProjStatus(s)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        newProjStatus === s
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-inner shadow-indigo-500/5"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3 bg-zinc-950/20 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/10 active:scale-[0.98] transition-all"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Modal / Sheet to Update an Existing Project */}
      {showUpdateProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/20">
              <h3 className="text-base font-bold text-zinc-100">Update Project Details</h3>
              <button
                onClick={() => setShowUpdateProjectModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUpdateProject} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Portfolio v2"
                  value={updateProjName}
                  onChange={(e) => setUpdateProjName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm text-zinc-100 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Description
                </label>
                <textarea
                  placeholder="Briefly describe what you're building..."
                  value={updateProjDesc}
                  onChange={(e) => setUpdateProjDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm text-zinc-100 min-h-[80px] outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Remote, Tokyo Office, Local Dev"
                  value={updateProjLocation}
                  onChange={(e) => setUpdateProjLocation(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500/50 rounded-xl py-2 px-3 text-sm text-zinc-100 outline-none transition-all"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3 bg-zinc-950/20 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowUpdateProjectModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/10 active:scale-[0.98] transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
