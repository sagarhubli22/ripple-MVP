"use client";

import { useEffect, useState } from "react";

import { getSupabaseClient } from "../lib/supabaseClient";

export default function DashboardPage() {
  const [supabaseStatus, setSupabaseStatus] = useState(
    "Checking Supabase status..."
  );

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setSupabaseStatus(
        "Supabase not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    supabase.auth
      .getSession()
      .then(() => {
        setSupabaseStatus("Supabase client initialised.");
      })
      .catch(() => {
        setSupabaseStatus("Unable to connect to Supabase. Check your keys.");
      });
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-indigo-300">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Welcome to Ripple
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-300">
          This minimal dashboard is the starting point for Ripple&apos;s product
          experience. Use it to prototype your workflows, plug in Supabase, and
          rapidly iterate on your MVP.
        </p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="text-sm font-medium text-slate-200">Supabase status</p>
        <p className="mt-1 text-sm text-slate-400">{supabaseStatus}</p>
      </div>
    </section>
  );
}

