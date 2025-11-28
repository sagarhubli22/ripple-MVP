"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "../../../../lib/supabaseClient";
import { Event, Session } from "../../../../lib/analytics/types";
import { classifySentimentFromRating } from "../../../../lib/sentiment";
import { LivePollCard } from "../../../../components/polls/LivePollCard";
import type { Poll } from "../../../../lib/polls/types";

export default function FeedbackPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = (params?.eventId as string) || "unknown";

    const [event, setEvent] = useState<Event | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [attendeeCount, setAttendeeCount] = useState<number | null>(null);

    // Poll state
    const [livePoll, setLivePoll] = useState<Poll | null>(null);

    // Form state
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [rating, setRating] = useState<number>(0);
    const [comment, setComment] = useState("");

    useEffect(() => {
        const supabase = getSupabaseClient();
        if (!supabase) {
            setError("Supabase client not configured");
            setLoading(false);
            return;
        }

        const checkAuthAndFetchData = async () => {
            try {
                // Check auth
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    setUserId(user.id);
                }

                // Fetch event and sessions
                const [eventResult, sessionsResult] = await Promise.all([
                    supabase.from("events").select("*").eq("id", eventId).single(),
                    supabase.from("sessions").select("*").eq("event_id", eventId).order("start_time", { ascending: true }),
                ]);

                if (eventResult.error) throw eventResult.error;
                if (sessionsResult.error) throw sessionsResult.error;

                setEvent(eventResult.data);
                setSessions(sessionsResult.data || []);
            } catch (err) {
                console.error("Error loading feedback page:", err);
                setError("Failed to load event details");
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndFetchData();
    }, [eventId]);

    // Poll for live polls
    useEffect(() => {
        const fetchLivePoll = async () => {
            try {
                const response = await fetch(`/api/polls?eventId=${eventId}`);
                if (response.ok) {
                    const polls = await response.json();
                    const active = polls.find((p: Poll) => p.status === 'live');
                    setLivePoll(active || null);
                }
            } catch (err) {
                console.error("Error fetching polls:", err);
            }
        };

        if (eventId && eventId !== "unknown") {
            fetchLivePoll();
            const interval = setInterval(fetchLivePoll, 10000); // Check every 10 seconds
            return () => clearInterval(interval);
        }
    }, [eventId]);

    const handleSubmit = async (e?: React.FormEvent, options?: { ratingOnly?: boolean }) => {
        if (e) e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!userId) {
            setError("You must be signed in to leave feedback");
            return;
        }

        if (rating === 0) {
            setError("Please select a rating");
            return;
        }

        setSubmitting(true);
        const supabase = getSupabaseClient() as any;
        const commentToSend = options?.ratingOnly ? null : (comment || null);

        try {
            if (!supabase) throw new Error("Supabase not configured");

            // Start with rating-based fallback
            let sentiment = classifySentimentFromRating(rating).sentiment;
            let highlightInsight = null;
            let highlightUrgency = classifySentimentFromRating(rating).highlightUrgency;

            // Insert feedback first (without sentiment data)
            const { data: insertedFeedback, error: insertError } = await supabase
                .from("feedback")
                .insert({
                    event_id: eventId,
                    session_id: selectedSessionId || null,
                    user_id: userId,
                    rating,
                    comment: commentToSend,
                })
                .select()
                .single();

            if (insertError) {
                console.error("Insert error:", insertError);
                throw insertError;
            }

            console.log("Inserted feedback:", insertedFeedback.id);

            // Try to call AI sentiment classification API
            if (insertedFeedback?.id) {
                try {
                    console.log("Calling sentiment API with:", { feedbackId: insertedFeedback.id, text: commentToSend, rating });

                    const sentimentResponse = await fetch("/api/classifySentiment", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            feedbackId: insertedFeedback.id,
                            text: commentToSend || "",
                            rating,
                        }),
                    });

                    if (sentimentResponse.ok) {
                        const sentimentData = await sentimentResponse.json();
                        console.log("Sentiment API response:", sentimentData);
                        sentiment = sentimentData.sentiment;
                        highlightInsight = sentimentData.insight;
                        highlightUrgency = sentimentData.urgency;
                    } else {
                        console.warn("Sentiment API failed, using rating-based fallback");
                    }
                } catch (sentimentErr) {
                    console.warn("Error calling sentiment API, using rating-based fallback:", sentimentErr);
                }

                // Update the feedback with sentiment data (either from API or fallback)
                const { error: updateError } = await supabase
                    .from("feedback")
                    .update({
                        sentiment,
                        highlight_insight: highlightInsight,
                        highlight_urgency: highlightUrgency,
                    })
                    .eq("id", insertedFeedback.id);

                if (updateError) {
                    console.error("Failed to update sentiment:", updateError);
                }
            }

            // Automatically record attendance
            const { error: attendanceError } = await supabase.from("attendance").insert({
                event_id: eventId,
                session_id: selectedSessionId || null,
                user_id: userId,
                check_in_time: new Date().toISOString(),
            });

            if (attendanceError) {
                // Log but don't fail feedback submission if attendance fails (e.g. duplicate check-in)
                console.warn("Failed to record attendance:", attendanceError);
            }

            // Fetch attendee count for confirmation message
            try {
                const { count } = await supabase
                    .from("attendance")
                    .select("*", { count: "exact", head: true })
                    .eq("event_id", eventId);

                if (count !== null) {
                    setAttendeeCount(count);
                }
            } catch (countErr) {
                console.warn("Failed to fetch attendee count:", countErr);
            }

            setSuccess(true);
            setRating(0);
            setComment("");
            setSelectedSessionId("");
            // Scroll to top to see success message
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            console.error("Error submitting feedback:", err);
            setError("Failed to submit feedback. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
                Loading...
            </div>
        );
    }

    if (!event) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
                Event not found
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 px-4 py-12 text-slate-200">
            <div className="mx-auto max-w-2xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white">{event.name}</h1>
                    <p className="mt-2 text-slate-400">We value your feedback!</p>
                </div>

                {/* Live Poll Card */}
                {livePoll && (
                    <div className="mb-8">
                        <LivePollCard poll={livePoll} />
                    </div>
                )}

                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm sm:p-8">
                    {!userId ? (
                        <div className="text-center">
                            <p className="mb-4 text-slate-300">You need to be signed in to submit feedback.</p>
                            <button
                                onClick={() => router.push("/signin")}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                            >
                                Sign In
                            </button>
                        </div>
                    ) : success ? (
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-medium text-white">Thank you!</h3>
                            <p className="mt-2 text-slate-400">Your feedback has been recorded.</p>

                            {/* Confirmation message */}
                            <p className="mt-4 animate-fade-in text-base font-semibold italic text-slate-300">
                                {attendeeCount !== null
                                    ? `Your input just improved this event for ${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}.`
                                    : "Your input just improved this event for everyone who attends."}
                            </p>

                            <button
                                onClick={() => setSuccess(false)}
                                className="mt-6 text-sm text-indigo-400 hover:text-indigo-300"
                            >
                                Submit another response
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
                            {error && (
                                <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Session Selection */}
                            <div>
                                <label htmlFor="session" className="block text-sm font-medium text-slate-300">
                                    What are you reviewing?
                                </label>
                                <select
                                    id="session"
                                    value={selectedSessionId}
                                    onChange={(e) => setSelectedSessionId(e.target.value)}
                                    className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    <option value="">General Event Feedback</option>
                                    {sessions.map((session) => (
                                        <option key={session.id} value={session.id}>
                                            {session.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Rating */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Rating</label>
                                <div className="mt-2 flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className={`flex h-10 w-10 items-center justify-center rounded-md border transition-all ${rating >= star
                                                ? "border-indigo-500 bg-indigo-500 text-white"
                                                : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                                                }`}
                                        >
                                            {star}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    {rating === 1
                                        ? "Poor"
                                        : rating === 2
                                            ? "Fair"
                                            : rating === 3
                                                ? "Good"
                                                : rating === 4
                                                    ? "Very Good"
                                                    : rating === 5
                                                        ? "Excellent"
                                                        : "Select a rating"}
                                </p>
                            </div>

                            {/* Comment */}
                            <div>
                                <label htmlFor="comment" className="block text-sm font-medium text-slate-300">
                                    Comments (Optional)
                                </label>
                                <textarea
                                    id="comment"
                                    rows={4}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Share your thoughts..."
                                    className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {submitting ? "Submitting..." : "Submit Feedback"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(undefined, { ratingOnly: true })}
                                    disabled={submitting}
                                    className="flex-1 rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-900/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Submit rating only
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
