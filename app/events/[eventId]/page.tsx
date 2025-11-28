"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { AuthGuard } from "../../../components/AuthGuard";
import { getSupabaseClient } from "../../../lib/supabaseClient";
import { Event, Session } from "../../../lib/analytics/types";

export default function EventDetailPage() {
    const params = useParams();
    const eventId = (params?.eventId as string) || "unknown";

    const [event, setEvent] = useState<Event | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [showQR, setShowQR] = useState(false);

    useEffect(() => {
        const supabase = getSupabaseClient();
        if (!supabase) {
            setError("Supabase client not configured");
            setLoading(false);
            return;
        }

        if (!eventId || eventId === "unknown") {
            setError("Event ID missing from route");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const [eventResult, sessionsResult] = await Promise.all([
                    supabase.from("events").select("*").eq("id", eventId).single(),
                    supabase.from("sessions").select("*").eq("event_id", eventId).order("start_time", {
                        ascending: true,
                    }),
                ]);

                if (eventResult.error) throw eventResult.error;
                if (sessionsResult.error) throw sessionsResult.error;

                setEvent(eventResult.data);
                setSessions(sessionsResult.data || []);
            } catch (err) {
                console.error("Error loading event:", err);
                setError("Failed to load event details");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [eventId]);

    const handleCopyFeedbackLink = async () => {
        const link = `${window.location.origin}/events/${eventId}/feedback`;

        try {
            await navigator.clipboard.writeText(link);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 3000);
        } catch (err) {
            // Fallback for browsers where clipboard API might fail or be restricted
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

    if (loading) {
        return (
            <AuthGuard>
                <div className="mx-auto max-w-7xl px-4 py-8 text-slate-400">Loading event...</div>
            </AuthGuard>
        );
    }

    if (error || !event) {
        return (
            <AuthGuard>
                <div className="mx-auto max-w-7xl px-4 py-8">
                    <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-red-300">
                        {error || "Event not found"}
                    </div>
                    <Link
                        href="/overview"
                        className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>
            </AuthGuard>
        );
    }

    const feedbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/events/${eventId}/feedback` : '';

    return (
        <AuthGuard>
            <div className="mx-auto max-w-7xl px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white">{event.name}</h1>

                        {/* Copy Feedback Link & QR Code Buttons */}
                        <div className="mt-3 flex items-center gap-3">
                            <p className="text-sm text-slate-400">
                                Share this link so attendees can leave feedback.
                            </p>
                            <button
                                type="button"
                                onClick={handleCopyFeedbackLink}
                                className="px-3 py-1.5 rounded-md bg-purple-600 text-xs font-medium text-white hover:bg-purple-500 transition"
                            >
                                Copy Feedback Link
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowQR(true)}
                                className="px-3 py-1.5 rounded-md bg-purple-600 text-xs font-medium text-white hover:bg-purple-500 transition"
                            >
                                Show QR Code
                            </button>
                            {copySuccess && (
                                <span className="text-xs font-medium text-green-400 animate-fade-in">
                                    Copied!
                                </span>
                            )}
                        </div>

                        <p className="mt-4 text-sm text-slate-400">{formatDate(event.date)}</p>
                        {event.description && (
                            <p className="mt-4 max-w-2xl text-slate-300">{event.description}</p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href={`/events/${eventId}/analytics`}
                            className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
                        >
                            View Analytics
                        </Link>
                        <Link
                            href="/overview"
                            className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Sessions List */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">Sessions</h2>
                    {sessions.length === 0 ? (
                        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
                            No sessions found for this event.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
                                >
                                    <div className="font-medium text-white">{session.title}</div>
                                    <div className="mt-2 text-xs text-slate-400 flex gap-3 flex-wrap">
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
                            ))}
                        </div>
                    )}
                </section>

                {/* QR Code Modal */}
                {showQR && (
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
            </div>
        </AuthGuard>
    );
}
