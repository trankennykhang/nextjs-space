"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SecurityWrapper from "@/components/SecurityWrapper";

function AdminDashboard() {
  const [allowedIp, setAllowedIp] = useState("");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [clientIp, setClientIp] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Load config settings
  useEffect(() => {
    async function loadConfig() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/security/config");
        if (!res.ok) {
          throw new Error("Failed to load security config");
        }
        const data = await res.json() as { allowedIp: string; defaultPassword: string; clientIp: string };
        setAllowedIp(data.allowedIp);
        setDefaultPassword(data.defaultPassword);
        setClientIp(data.clientIp || "");
      } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: "Failed to load security settings." });
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultPassword.trim()) {
      setMessage({ type: "error", text: "Default password cannot be empty." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/security/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedIp, defaultPassword }),
      });

      const data = await res.json() as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Security configurations updated successfully!" });
        // Auto clear success message after 4s
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update configurations." });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Server connection failed." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseCurrentIp = () => {
    if (clientIp) {
      setAllowedIp(clientIp);
      setMessage({ type: "success", text: "IP copied to input. Save settings to apply." });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        throw new Error("Failed to load projects data");
      }
      const json = await res.json() as { data?: unknown[] };
      const projects = json.data || [];

      // Download file
      const jsonString = JSON.stringify(projects, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `projects_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "Database exported and downloaded successfully!" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error("Export failed:", err);
      setMessage({ type: "error", text: "Failed to export projects database." });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* Background ambient accents */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      {/* Admin Header */}
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Security Control Panel
            </h1>
            <p className="text-xs text-zinc-500 font-medium">Administrator Settings</p>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:text-white hover:border-zinc-700 transition-all active:scale-[0.98] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-3">
              <span className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
              <span className="text-sm font-semibold animate-pulse">Decrypting configurations...</span>
            </div>
          ) : (
            <div className="bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
              
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-zinc-100 bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-zinc-200 to-indigo-300">
                  Global Access Protocols
                </h2>
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                  Define authorization protocols to shield this application. If a client connects from the Whitelisted IP address, password prompt is bypassed.
                </p>
              </div>

              {/* Form settings */}
              <form onSubmit={handleSave} className="space-y-6">
                
                {/* Allowed IP Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Whitelisted IP Address
                    </label>
                    <span className="text-[10px] text-zinc-500 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">
                      Current IP: <span className="font-mono text-indigo-400">{clientIp || "detecting..."}</span>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.100 (leave blank to disable IP bypass)"
                      value={allowedIp}
                      onChange={(e) => setAllowedIp(e.target.value)}
                      className="flex-1 bg-zinc-950/70 border border-zinc-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-2xl py-2.5 px-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleUseCurrentIp}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-2.5 px-4 rounded-2xl text-xs border border-zinc-800 transition-all hover:border-zinc-700 active:scale-[0.98] cursor-pointer whitespace-nowrap"
                    >
                      Use My Current IP
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600 leading-normal font-medium">
                    Recommended: whitelisting your current IP allows seamless development, bypassing password verification prompts entirely.
                  </p>
                </div>

                {/* Default Password Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Dashboard Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new dashboard password"
                      value={defaultPassword}
                      onChange={(e) => setDefaultPassword(e.target.value)}
                      className="w-full bg-zinc-950/70 border border-zinc-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-2xl py-2.5 pl-4 pr-12 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all font-mono tracking-wider"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600 leading-normal font-medium">
                    This password is required for validation if a user is not whitelisted by IP address.
                  </p>
                </div>

                {/* Status Message Notification */}
                {message && (
                  <div 
                    className={`p-3.5 rounded-2xl text-xs font-semibold border flex items-center gap-2.5 animate-fade-in ${
                      message.type === "success" 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}
                  >
                    {message.type === "success" ? (
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                    <span>{message.text}</span>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                  <Link
                    href="/"
                    className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/10 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Saving Settings...
                      </>
                    ) : (
                      "Apply Security settings"
                    )}
                  </button>
                </div>
              </form>

              {/* Data Operations */}
              <div className="border-t border-zinc-800 pt-6 mt-2 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-300">
                    Data Backups & Export
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Download a secure backup of all project records, status developments, and activity histories in raw JSON format.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="w-full bg-zinc-950/70 border border-zinc-800 hover:bg-zinc-900 hover:text-white hover:border-zinc-700 text-zinc-300 font-bold py-2.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin"></span>
                      Gathering records...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export Projects Database (JSON)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Wrap with SecurityWrapper to guard security configs page
export default function AdminPage() {
  return (
    <SecurityWrapper>
      <AdminDashboard />
    </SecurityWrapper>
  );
}
