"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AuthGuard } from "../../components/AuthGuard";
import { getSupabaseClient } from "../../lib/supabaseClient";

import { UpgradeModal } from "../../components/UpgradeModal";

interface Event {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  date: string | null;
  created_at: string;
}

interface Session {
  id: string;
  event_id: string;
  owner_id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

export default function OverviewPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionStart, setNewSessionStart] = useState("");
  const [newSessionEnd, setNewSessionEnd] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const supabase = getSupabaseClient();

  // Fetch current user
  useEffect(() => {
    if (!supabase) {
      setError("Supabase client not configured");
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!currentUser) {
          setError("No user found");
          setLoading(false);
          return;
        }

        setUser({ id: currentUser.id });
        await fetchEvents(currentUser.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user");
        setLoading(false);
      }
    };

    fetchUser();
  }, [supabase]);

  // Fetch events
  const fetchEvents = async (userId: string) => {
    if (!supabase) return;

    try {
      const { data, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;

      setEvents(data || []);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
      setLoading(false);
    }
  };

  // Fetch sessions for selected event
  useEffect(() => {
    if (!selectedEventId || !user || !supabase) {
      setSessions([]);
      return;
    }

    const fetchSessions = async () => {
      try {
        const { data, error: sessionsError } = await supabase
          .from("sessions")
          .select("*")
          .eq("event_id", selectedEventId)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (sessionsError) throw sessionsError;

        setSessions(data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch sessions"
        );
      }
    };

    fetchSessions();
  }, [selectedEventId, user, supabase]);

  // Create new event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase || !newEventName.trim()) return;

    setCreatingEvent(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: newEventName.trim(),
          description: newEventDescription.trim() || null,
          date: newEventDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.error === "LIMIT_REACHED") {
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(data.error || "Failed to create event");
      }

      setEvents([data.event, ...events]);
      setNewEventName("");
      setNewEventDescription("");
      setNewEventDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setCreatingEvent(false);
    }
  };

  // Create new session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase || !selectedEventId || !newSessionTitle.trim())
      return;

    setCreatingSession(true);
    setError(null);

    try {
      const sessionData: {
        title: string;
        event_id: string;
        owner_id: string;
        start_time?: string | null;
        end_time?: string | null;
      } = {
        title: newSessionTitle.trim(),
        event_id: selectedEventId,
        owner_id: user.id,
      };

      if (newSessionStart) {
        sessionData.start_time = newSessionStart;
      }

      if (newSessionEnd) {
        sessionData.end_time = newSessionEnd;
      }

      const supabase = getSupabaseClient() as any;
      const { data, error: createError } = await supabase
        .from("sessions")
        .insert([sessionData])
        .select()
        .single();

      if (createError) throw createError;

      setSessions([data, ...sessions]);
      setNewSessionTitle("");
      setNewSessionStart("");
      setNewSessionEnd("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreatingSession(false);
    }
  };

  const handleCopyFeedbackLink = async () => {
    if (!selectedEventId) return;
    const link = `${window.location.origin}/events/${selectedEventId}/feedback`;

    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      } catch (fallbackErr) {
        console.error("Failed to copy link:", fallbackErr);
      }
    }
  };

  const feedbackUrl = typeof window !== 'undefined' && selectedEventId ? `${window.location.origin}/events/${selectedEventId}/feedback` : '';

  if (loading) {
    return (
      <AuthGuard>
        <section className="space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Overview
          </h1>
          <div className="text-slate-400">Loading...</div>
        </section>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <section className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Overview
        </h1>

        {error && (
          <div className="rounded-md bg-red-500/20 border border-red-500/50 p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Events Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Events</h2>
          </div>

          {/* New Event Form */}
          <form
            onSubmit={handleCreateEvent}
            className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Event name"
                className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={creatingEvent}
              />
              <input
                type="datetime-local"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="w-56 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={creatingEvent}
              />
            </div>
            <textarea
              value={newEventDescription}
              onChange={(e) => setNewEventDescription(e.target.value)}
              placeholder="Event description (optional)"
              className="min-h-[80px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={creatingEvent}
            />
            <button
              type="submit"
              disabled={creatingEvent || !newEventName.trim()}
              className="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingEvent ? "Creating..." : "Create Event"}
            </button>
          </form>

          {/* Events List */}
          {events.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
              No events yet. Create your first event above.
            </div>
          ) : (
            <div className="grid gap-3">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={`rounded-lg border p-4 text-left transition-colors ${selectedEventId === event.id
                    ? "border-indigo-500 bg-indigo-500/20"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    }`}
                >
                  <div className="font-medium text-white">{event.name}</div>
                  {event.description && (
                    <div className="mt-1 text-sm text-slate-300">
                      {event.description}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>
                      Created {new Date(event.created_at).toLocaleDateString()}
                    </span>
                    {event.date && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                        Event {new Date(event.date).toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sessions Section */}
        {selectedEventId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-4">
                <span>
                  Sessions
                  {selectedEventId &&
                    events.find((event) => event.id === selectedEventId) && (
                      <span className="ml-2 text-sm font-normal text-slate-400">
                        - {events.find((event) => event.id === selectedEventId)?.name}
                      </span>
                    )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyFeedbackLink}
                    className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 transition"
                  >
                    Copy Feedback Link
                  </button>
                  <button
                    onClick={() => setShowQR(true)}
                    className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 transition"
                  >
                    Show QR Code
                  </button>
                  {copySuccess && (
                    <span className="text-xs font-medium text-green-400 animate-fade-in">
                      Copied!
                    </span>
                  )}
                </div>
              </h2>
            </div>

            {/* New Session Form */}
            <form
              onSubmit={handleCreateSession}
              className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4"
            >
              <input
                type="text"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="Session title"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={creatingSession}
              />
              <input
                type="datetime-local"
                value={newSessionStart}
                onChange={(e) => setNewSessionStart(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={creatingSession}
              />
              <input
                type="datetime-local"
                value={newSessionEnd}
                onChange={(e) => setNewSessionEnd(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={creatingSession}
              />
              <button
                type="submit"
                disabled={creatingSession || !newSessionTitle.trim()}
                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingSession ? "Creating..." : "New Session"}
              </button>
            </form>

            {/* Sessions List */}
            {sessions.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
                No sessions yet. Create your first session above.
              </div>
            ) : (
              <div className="grid gap-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-white">
                          {session.title}
                        </div>
                        <div className="mt-2 text-xs text-slate-400 flex gap-3 flex-wrap">
                          <div className="mt-1 text-xs text-slate-400">
                            Created {new Date(session.created_at).toLocaleString()}
                          </div>
                          {session.start_time && (
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                              Starts {new Date(session.start_time).toLocaleString()}
                            </span>
                          )}
                          {session.end_time && (
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
                              Ends {new Date(session.end_time).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedEventId && events.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
            Select an event above to view and manage its sessions.
          </div>
        )}

        {/* QR Code Modal */}
        {showQR && selectedEventId && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-neutral-900 p-6 rounded-lg shadow-lg text-center border border-slate-700">
              <h3 className="mb-4 text-lg font-medium text-white">Scan to Give Feedback</h3>
              <div className="bg-white p-4 rounded-md inline-block">
                <QRCodeSVG
                  value={feedbackUrl}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setShowQR(false)}
                  className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-500 transition text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </section>
    </AuthGuard>
  );
}
