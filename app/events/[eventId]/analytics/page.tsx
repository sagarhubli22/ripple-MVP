"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "../../../../components/AuthGuard";
import { getSupabaseClient } from "../../../../lib/supabaseClient";
import { Event, Session, FeedbackRow, AttendanceRow } from "../../../../lib/analytics/types";
import {
  calculateAverageRating,
  getDistinctAttendeeCount,
  calculateSessionStats,
} from "../../../../lib/analytics/utils";
import { exportAttendanceToCSV, exportFeedbackToCSV } from "../../../../lib/analytics/csvExport";
import { KpiCard } from "../../../../components/analytics/KpiCard";
import { AttendanceChart } from "../../../../components/analytics/AttendanceChart";
import { AttendanceTable } from "../../../../components/analytics/AttendanceTable";
import { FeedbackSummary } from "../../../../components/analytics/FeedbackSummary";
import { FeedbackComments } from "../../../../components/analytics/FeedbackComments";
import { SessionComparisonTable } from "../../../../components/analytics/SessionComparisonTable";
import { SmartPollSuggestionModal } from "../../../../components/polls/SmartPollSuggestionModal";
import { PollsManager } from "../../../../components/polls/PollsManager";
import type { SmartPollSuggestion } from "../../../../lib/polls/types";

// Component Error Boundary Wrapper
function ComponentErrorBoundary({
  children,
  componentName,
}: {
  children: React.ReactNode;
  componentName: string;
}) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error(`Error in ${componentName}:`, event.error);
      setError(event.error);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, [componentName]);

  if (hasError) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4">
        <p className="text-sm font-medium text-red-300">Error rendering {componentName}</p>
        {error && <p className="mt-1 text-xs text-red-400">{error.message}</p>}
      </div>
    );
  }

  try {
    return <>{children}</>;
  } catch (err) {
    console.error(`Error in ${componentName}:`, err);
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4">
        <p className="text-sm font-medium text-red-300">Error rendering {componentName}</p>
        {err instanceof Error && <p className="mt-1 text-xs text-red-400">{err.message}</p>}
      </div>
    );
  }
}

export default function EventAnalyticsPage() {
  const params = useParams();
  const eventId = (params?.eventId as string) || "unknown";

  const [event, setEvent] = useState<Event | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [aiSummaryErrorDetails, setAiSummaryErrorDetails] = useState<string | null>(null);

  // Smart Polls State
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollSuggestion, setPollSuggestion] = useState<SmartPollSuggestion | null>(null);
  const [pollSuggestionLoading, setPollSuggestionLoading] = useState(false);

  useEffect(() => {
    // Only initialize Supabase client inside useEffect (client-side only)
    const supabase = getSupabaseClient();

    if (!supabase) {
      console.error("Supabase client not configured");
      setError("Supabase client not configured");
      setLoading(false);
      return;
    }

    if (!eventId || eventId === "unknown") {
      console.error("Event ID missing from route");
      setError("Event ID missing from route");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        console.log("Fetching analytics data for event:", eventId);

        // Fetch all data in parallel
        const [eventResult, sessionsResult, feedbackResult, attendanceResult] = await Promise.all([
          supabase.from("events").select("*").eq("id", eventId).single(),
          supabase.from("sessions").select("*").eq("event_id", eventId).order("start_time", {
            ascending: true,
          }),
          supabase.from("feedback").select("*").eq("event_id", eventId),
          supabase.from("attendance").select("*").eq("event_id", eventId),
        ]);

        if (eventResult.error) {
          console.error("Error fetching event:", eventResult.error);
          throw eventResult.error;
        }
        if (sessionsResult.error) {
          console.error("Error fetching sessions:", sessionsResult.error);
          throw sessionsResult.error;
        }
        if (feedbackResult.error) {
          console.error("Error fetching feedback:", feedbackResult.error);
          throw feedbackResult.error;
        }
        if (attendanceResult.error) {
          console.error("Error fetching attendance:", attendanceResult.error);
          throw attendanceResult.error;
        }

        setEvent(eventResult.data);
        setSessions(sessionsResult.data || []);
        setFeedback(feedbackResult.data || []);
        setAttendance(attendanceResult.data || []);
        setLoading(false);
        console.log("Analytics data loaded successfully");
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError(err instanceof Error ? err.message : "Failed to load analytics data");
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleExportAttendance = () => {
    try {
      exportAttendanceToCSV(attendance);
      setToastMessage("Attendance CSV exported successfully");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Error exporting attendance:", err);
      setToastMessage("Failed to export attendance CSV");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleExportFeedback = () => {
    try {
      exportFeedbackToCSV(feedback);
      setToastMessage("Feedback CSV exported successfully");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Error exporting feedback:", err);
      setToastMessage("Failed to export feedback CSV");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleGenerateAISummary = async () => {
    setAiSummaryLoading(true);
    setAiSummaryError(null);
    setAiSummaryErrorDetails(null);
    setAiSummary(null);

    try {
      const response = await fetch("/api/event-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        setAiSummaryError(errorData.error || "Failed to generate summary");
        if (errorData.details) {
          setAiSummaryErrorDetails(errorData.details);
        }
        return;
      }

      const data = await response.json();
      setAiSummary(data.summary);
    } catch (err) {
      console.error("Error generating AI summary:", err);
      setAiSummaryError(
        err instanceof Error ? err.message : "Failed to generate summary"
      );
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleSuggestPoll = async () => {
    setPollSuggestionLoading(true);
    setPollSuggestion(null);

    try {
      const response = await fetch("/api/suggestSmartPoll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, eventName: event?.name }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to generate poll suggestion (${response.status})`);
      }

      const suggestion = await response.json();
      console.log("Frontend received suggestion:", suggestion);
      setPollSuggestion(suggestion);
      setIsPollModalOpen(true);
    } catch (err) {
      console.error("Error generating poll suggestion:", err);
      setToastMessage(err instanceof Error ? err.message : "Couldn't generate a smart poll right now.");
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setPollSuggestionLoading(false);
    }
  };

  // Calculate KPIs (with safe defaults)
  const totalAttendees = attendance.length > 0 ? getDistinctAttendeeCount(attendance) : 0;
  const checkInRate = totalAttendees > 0 ? "100%" : "0%";
  const sessionCount = sessions.length;
  const feedbackCount = feedback.length;
  const averageRating = feedback.length > 0 ? calculateAverageRating(feedback) : 0;
  const sessionStats = sessions.length > 0 ? calculateSessionStats(sessions, attendance, feedback) : [];

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
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Toast Message */}
        {toastMessage && (
          <div className="fixed right-4 top-24 z-50 rounded-lg border border-indigo-500/50 bg-indigo-500/90 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-sm">
            {toastMessage}
          </div>
        )}

        {/* Page Header - Always visible */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {event ? event.name : `Analytics for ${eventId}`}
              </h1>
              {event && (
                <p className="mt-1 text-sm text-slate-400">{formatDate(event.date)}</p>
              )}
              {!event && (
                <>
                  <p className="mt-1 text-sm text-slate-400">If you see this, routing is working.</p>
                  <div className="mt-2 rounded bg-green-500/20 px-2 py-1 text-xs text-green-300">
                    ✓ Page is rendering! Event ID: {eventId}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSuggestPoll}
                disabled={pollSuggestionLoading}
                className="rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
              >
                {pollSuggestionLoading ? "Generating..." : "✨ Suggest Smart Poll"}
              </button>
              <Link
                href={`/events/${eventId}`}
                className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
              >
                Back to event
              </Link>
            </div>
          </div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Analytics</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 rounded-lg border border-red-500/50 bg-red-500/20 p-4 text-red-300">
            <p className="font-medium">Error loading analytics</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-8 rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center">
            <div className="text-slate-400">Loading analytics data...</div>
          </div>
        )}

        {/* KPI Summary Row */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-white">Key Metrics</h2>
          <ComponentErrorBoundary componentName="KPI Cards">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <KpiCard
                label="Total Attendees"
                value={totalAttendees}
                caption="Distinct users"
              />
              <KpiCard
                label="Check-in Rate"
                value={checkInRate}
                caption="Estimated"
              />
              <KpiCard
                label="Sessions"
                value={sessionCount}
                caption="Total sessions"
              />
              <KpiCard
                label="Feedback"
                value={feedbackCount}
                caption="Total responses"
              />
              <KpiCard
                label="Average Rating"
                value={averageRating > 0 ? averageRating.toFixed(1) : "N/A"}
                caption="Average rating (1–5)"
              />
            </div>
          </ComponentErrorBoundary>
        </section>

        {/* Polls Manager Section */}
        <section className="mb-8">
          <ComponentErrorBoundary componentName="Polls Manager">
            <PollsManager eventId={eventId} />
          </ComponentErrorBoundary>
        </section>

        {/* Attendance Section */}
        <section className="mb-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">Attendance</h2>
          <ComponentErrorBoundary componentName="Attendance Chart">
            <AttendanceChart sessions={sessions} attendance={attendance} />
          </ComponentErrorBoundary>
          <ComponentErrorBoundary componentName="Attendance Table">
            <AttendanceTable sessions={sessions} attendance={attendance} />
          </ComponentErrorBoundary>
        </section>

        {/* Feedback Summary Section */}
        <section className="mb-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">Feedback</h2>
          <ComponentErrorBoundary componentName="Feedback Summary">
            <FeedbackSummary sessions={sessions} feedback={feedback} />
          </ComponentErrorBoundary>
        </section>

        {/* Feedback Comments Section */}
        <section className="mb-8">
          <ComponentErrorBoundary componentName="Feedback Comments">
            <FeedbackComments sessions={sessions} feedback={feedback} />
          </ComponentErrorBoundary>
        </section>

        {/* Engagement Comparison Section */}
        <section className="mb-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">Session Comparison</h2>
          <ComponentErrorBoundary componentName="Session Comparison Table">
            {sessionStats.length > 0 ? (
              <SessionComparisonTable sessionStats={sessionStats} />
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-slate-400">
                No session data available
              </div>
            )}
          </ComponentErrorBoundary>
        </section>

        {/* AI Summary Section */}
        <section className="mb-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">AI Summary</h2>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
            <div className="mb-4">
              <button
                onClick={handleGenerateAISummary}
                disabled={aiSummaryLoading}
                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiSummaryLoading ? "Generating..." : "Generate AI Summary"}
              </button>
            </div>

            {aiSummaryError && (
              <div className="mb-4 rounded-md border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-300">
                <p className="font-medium">{aiSummaryError}</p>
                {aiSummaryErrorDetails && (
                  <p className="mt-1 text-xs opacity-80 font-mono break-all">{aiSummaryErrorDetails}</p>
                )}
              </div>
            )}

            {aiSummaryLoading && (
              <div className="rounded-md border border-slate-800 bg-slate-800/40 p-4 text-center text-slate-400">
                Generating AI summary...
              </div>
            )}

            {aiSummary && !aiSummaryLoading && (
              <div className="rounded-md border border-slate-800 bg-slate-800/40 p-4">
                <div className="prose prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                    {aiSummary}
                  </p>
                </div>
              </div>
            )}

            {!aiSummary && !aiSummaryLoading && !aiSummaryError && (
              <div className="rounded-md border border-slate-800 bg-slate-800/40 p-4 text-center text-slate-400">
                Click the button above to generate an AI-powered summary of this event.
              </div>
            )}
          </div>
        </section>

        {/* Actions Section */}
        <section className="mb-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportAttendance}
              disabled={attendance.length === 0}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export attendance CSV
            </button>
            <button
              onClick={handleExportFeedback}
              disabled={feedback.length === 0}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export feedback CSV
            </button>
          </div>
        </section>

        {/* Smart Poll Suggestion Modal */}
        <SmartPollSuggestionModal
          isOpen={isPollModalOpen}
          suggestion={pollSuggestion}
          eventId={eventId}
          onClose={() => setIsPollModalOpen(false)}
          onPollCreated={() => {
            // Refresh polls list logic is handled inside PollsManager via polling,
            // but we could also force a refresh if we lifted state up.
            // For now, the polling in PollsManager will catch it shortly.
          }}
        />
      </div>
    </AuthGuard>
  );
}
