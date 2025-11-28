"use client";

import { useState, useEffect } from "react";
import type { SmartPollSuggestion, PollType } from "../../lib/polls/types";

interface SmartPollSuggestionModalProps {
    isOpen: boolean;
    suggestion: SmartPollSuggestion | null;
    eventId: string;
    onClose: () => void;
    onPollCreated?: () => void;
}

export function SmartPollSuggestionModal({
    isOpen,
    suggestion,
    eventId,
    onClose,
    onPollCreated,
}: SmartPollSuggestionModalProps) {
    const [type, setType] = useState<PollType>(suggestion?.type || "poll");
    const [question, setQuestion] = useState(suggestion?.question || "");
    const [option1, setOption1] = useState(suggestion?.option_1 || "");
    const [option2, setOption2] = useState(suggestion?.option_2 || "");
    const [option3, setOption3] = useState(suggestion?.option_3 || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Update state when suggestion changes
    useEffect(() => {
        console.log("Modal received suggestion:", suggestion);
        if (suggestion) {
            setType(suggestion.type);
            setQuestion(suggestion.question);
            setOption1(suggestion.option_1 || "");
            setOption2(suggestion.option_2 || "");
            setOption3(suggestion.option_3 || "");
        }
    }, [suggestion]);

    const handleSaveDraft = async () => {
        await savePoll("draft");
    };

    const handleLaunch = async () => {
        await savePoll("live");
    };

    const savePoll = async (status: "draft" | "live") => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/polls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: eventId,
                    type,
                    question,
                    option_1: option1 || null,
                    option_2: option2 || null,
                    option_3: option3 || null,
                    status,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save poll");
            }

            onPollCreated?.();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save poll");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !suggestion) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
                <h2 className="mb-4 text-2xl font-bold text-white">
                    AI-Suggested Poll
                </h2>

                {error && (
                    <div className="mb-4 rounded-md border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Type selector */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as PollType)}
                            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="poll">Poll (with options)</option>
                            <option value="icebreaker">Icebreaker (open-ended)</option>
                        </select>
                    </div>

                    {/* Question */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                            Question
                        </label>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Enter your poll question..."
                        />
                    </div>

                    {/* Options (only show for poll type) */}
                    {type === "poll" && (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-300">
                                Options
                            </label>
                            <input
                                type="text"
                                value={option1}
                                onChange={(e) => setOption1(e.target.value)}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Option 1"
                            />
                            <input
                                type="text"
                                value={option2}
                                onChange={(e) => setOption2(e.target.value)}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Option 2 (optional)"
                            />
                            <input
                                type="text"
                                value={option3}
                                onChange={(e) => setOption3(e.target.value)}
                                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Option 3 (optional)"
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveDraft}
                        disabled={loading || !question.trim()}
                        className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                        Save as Draft
                    </button>
                    <button
                        onClick={handleLaunch}
                        disabled={loading || !question.trim()}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? "Launching..." : "Launch to Attendees"}
                    </button>
                </div>
            </div>
        </div>
    );
}
