"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabaseClient";

export function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      router.push("/signin");
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold tracking-tight">Ripple</span>
        <span className="text-xs text-slate-400">MVP</span>
      </div>
      <nav className="flex items-center gap-6 text-sm text-slate-300">

        <Link href="/support" className="hover:text-white transition-colors">
          Support
        </Link>
        <Link href="/billing" className="hover:text-white transition-colors text-indigo-400 font-medium">
          Upgrade
        </Link>
        {!loading && (
          <>
            {isAuthenticated ? (
              <button
                onClick={handleSignOut}
                className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-200 hover:bg-indigo-500/30 transition-colors"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/signin"
                className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-200 hover:bg-indigo-500/30 transition-colors"
              >
                Sign in
              </Link>
            )}
          </>
        )}
      </nav>
    </header>
  );
}

