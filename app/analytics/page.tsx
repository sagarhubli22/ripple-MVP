"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AuthGuard } from "../../components/AuthGuard";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { Event } from "../../lib/analytics/types";

export default function AnalyticsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setError("Supabase client not configured");
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          setError("No user found");
          setLoading(false);
          return;
        }

        const { data, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (eventsError) throw eventsError;

        setEvents(data || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(err instanceof Error ? err.message : "Failed to load events");
        setLoading(false);
      }
    };

    fetchEvents();
  }, [supabase]);

  const formatDate = (date: string | null) => {
    if (!date) return "No date set";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <AuthGuard>
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Analytics</h1>
          <p className="mt-2 text-sm text-slate-400">
            Select an event to view detailed analytics
          </p>
          {/* Debug: This should always be visible */}
          <div className="mt-2 rounded bg-indigo-500/20 px-2 py-1 text-xs text-indigo-300">
            Page loaded successfully. Status: {loading ? "Loading..." : error ? "Error" : `${events.length} events found`}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-red-300">
            <p className="font-medium">Error</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
            Loading events...
          </div>
        )}

        {!loading && !error && (
          <>
            {events.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center">
                <p className="text-slate-400">No events found.</p>
                <Link
                  href="/overview"
                  className="mt-4 inline-block text-indigo-400 hover:text-indigo-300"
                >
                  Create your first event →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}/analytics`}
                    className="group rounded-lg border border-slate-800 bg-slate-900/40 p-6 transition-colors hover:border-indigo-500/50 hover:bg-slate-900/60"
                  >
                    <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300">
                      {event.name}
                    </h3>
                    {event.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                        {event.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{formatDate(event.date)}</span>
                      <span className="text-sm font-medium text-indigo-400 group-hover:text-indigo-300">
                        View Analytics →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </AuthGuard>
  );
}
