"use client";

import React, { useState, useEffect } from "react";

interface SecurityWrapperProps {
  children: React.ReactNode;
}

export default function SecurityWrapper({ children }: SecurityWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [clientIp, setClientIp] = useState<string>("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/security/check");
        const data = await res.json() as { authenticated: boolean; clientIp: string };
        setClientIp(data.clientIp || "unknown");
        setIsAuthenticated(data.authenticated);
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthenticated(false); // Fallback to login form if API fails
      }
    }
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsSubmitting(true);
    setError(null);
    setShouldShake(false);

    try {
      const res = await fetch("/api/security/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json() as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        setIsAuthenticated(true);
      } else {
        setError(data.error || "Incorrect password");
        setShouldShake(true);
        // Reset shake after animation completes
        setTimeout(() => setShouldShake(false), 500);
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Unable to connect to security server");
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading State (Pulsing micro-animation)
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping"></div>
            {/* Spinning gradient ring */}
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
          </div>
          <span className="text-sm font-semibold tracking-wide text-zinc-400 animate-pulse">
            Verifying network credentials...
          </span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State (Password Input overlay)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center font-sans relative overflow-hidden px-4 selection:bg-indigo-500 selection:text-white">
        
        {/* Style injection for shake animation */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
          .animate-shake {
            animation: shake 0.4s ease-in-out;
          }
        `}} />

        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        {/* Password Card */}
        <div 
          className={`w-full max-w-md bg-zinc-900/35 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden transition-all duration-300 ${
            shouldShake ? "animate-shake border-rose-500/50 shadow-rose-950/10" : ""
          }`}
        >
          {/* Padlock Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 relative group">
            <svg 
              className={`w-6 h-6 text-white transition-transform duration-300 ${isSubmitting ? "scale-90" : "group-hover:scale-110"}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>

          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-indigo-300">
              Access Restricted
            </h2>
            <p className="text-xs text-zinc-500 font-medium max-w-xs mx-auto leading-relaxed">
              This space requires a default password or whitelisted IP address for validation.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className={`w-full bg-zinc-950/70 border rounded-2xl py-3 pl-4 pr-12 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all font-mono tracking-widest text-center ${
                  error 
                    ? "border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30" 
                    : "border-zinc-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                }`}
                autoFocus
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

            {/* Error Message */}
            {error && (
              <p className="text-center text-xs font-semibold text-rose-400 animate-fade-in">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-3 rounded-2xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-white/5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span>
                  Validating...
                </>
              ) : (
                "Unlock Dashboard"
              )}
            </button>
          </form>

          {/* Network Diagnostics */}
          <div className="border-t border-zinc-800/80 pt-4 flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Network Diagnostics
            </span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span>Your Request IP:</span>
              <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {clientIp || "Detecting..."}
              </span>
            </div>
            <p className="text-[10px] text-zinc-600 text-center max-w-[280px] mt-1 leading-normal font-medium">
              Whitelisting this IP address in the configuration panel will bypass this screen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated State
  return <>{children}</>;
}
