"use client";

import { useState } from "react";
import { getOrCreateAttendeeId, hasRespondedToPoll, markPollAsResponded } from "../../lib/polls/pollHelpers";
import type { Poll } from "../../lib/polls/types";

interface LivePollCardProps {
    poll: Poll;
}

export function LivePollCard({ poll }: LivePollCardProps) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(hasRespondedToPoll(poll.id));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const options = [poll.option_1, poll.option_2, poll.option_3].filter(
        (opt) => opt !== null && opt !== undefined && opt.trim() !== ""
    );

    const handleSubmit = async (option: string) => {
        if (submitted || loading) return;

        setLoading(true);
        setError(null);

        try {
            const attendeeId = getOrCreateAttendeeId();

            const response = await fetch(`/api/polls/${poll.id}/responses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attendee_identifier: attendeeId,
                    selected_option: option,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to submit response");
            }

            markPollAsResponded(poll.id, option);
            setSelectedOption(option);
            setSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit response");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-lg border border-indigo-500/50 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-6 shadow-lg">
            <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white">
                    {poll.type === "poll" ? "Quick Poll" : "Icebreaker"}
                </span>
                <span className="text-xs text-slate-400">Live now</span>
            </div>

            <h3 className="mb-4 text-lg font-semibold text-white">
                {poll.question}
            </h3>

            {error && (
                <div className="mb-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {error}
                </div>
            )}

            {!submitted && options.length > 0 && (
                <div className="space-y-2">
                    {options
                        .filter((option): option is string => option !== null)
                        .map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleSubmit(option)}
                                disabled={loading}
                                className="w-full rounded-md border border-slate-700 bg-slate-800/50 px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                            >
                                {option}
                            </button>
                        ))}
                </div>
            )}

            {!submitted && options.length === 0 && (
                <div className="text-sm text-slate-400">
                    This is an open-ended question. Share your thoughts in the feedback form below!
                </div>
            )}

            {submitted && (
                <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-center">
                    <p className="text-sm font-medium text-green-400">
                        ✓ Thanks for your response!
                    </p>
                    {selectedOption && (
                        <p className="mt-1 text-xs text-slate-400">
                            You selected: {selectedOption}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
