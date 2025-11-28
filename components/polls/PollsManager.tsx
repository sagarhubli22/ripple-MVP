"use client";

import { useState, useEffect } from "react";
import type { Poll, PollWithResponses } from "../../lib/polls/types";

interface PollsManagerProps {
    eventId: string;
}

export function PollsManager({ eventId }: PollsManagerProps) {
    const [polls, setPolls] = useState<PollWithResponses[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPolls = async () => {
        try {
            const response = await fetch(`/api/polls?eventId=${eventId}`);
            if (!response.ok) throw new Error("Failed to fetch polls");
            const data = await response.json();
            setPolls(data);
        } catch (err) {
            console.error("Error fetching polls:", err);
            setError("Failed to load polls");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolls();
        // Poll for updates every 10 seconds
        const interval = setInterval(fetchPolls, 10000);
        return () => clearInterval(interval);
    }, [eventId]);

    const handleStatusChange = async (pollId: string, newStatus: "live" | "closed") => {
        try {
            const response = await fetch("/api/polls", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: pollId, status: newStatus }),
            });

            if (!response.ok) throw new Error("Failed to update poll status");

            // Optimistic update
            setPolls(polls.map(p => p.id === pollId ? { ...p, status: newStatus } : p));
            fetchPolls(); // Refresh to be sure
        } catch (err) {
            console.error("Error updating poll:", err);
            alert("Failed to update poll status");
        }
    };

    const handleDelete = async (pollId: string) => {
        if (!confirm("Are you sure you want to delete this poll?")) return;

        try {
            const response = await fetch(`/api/polls?id=${pollId}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Failed to delete poll");

            setPolls(polls.filter(p => p.id !== pollId));
        } catch (err) {
            console.error("Error deleting poll:", err);
            alert("Failed to delete poll");
        }
    };

    if (loading && polls.length === 0) {
        return <div className="text-sm text-slate-400">Loading polls...</div>;
    }

    if (polls.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Polls & Icebreakers</h3>

            <div className="space-y-4">
                {polls.map((poll) => (
                    <div key={poll.id} className="rounded-md border border-slate-800 bg-slate-800/40 p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${poll.status === 'live'
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                            : poll.status === 'draft'
                                                ? 'bg-slate-500/20 text-slate-400 border border-slate-500/50'
                                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                        }`}>
                                        {poll.status.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-slate-500 uppercase tracking-wide">
                                        {poll.type}
                                    </span>
                                </div>
                                <p className="text-white font-medium">{poll.question}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Created {new Date(poll.created_at).toLocaleTimeString()}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {poll.status === 'draft' && (
                                    <button
                                        onClick={() => handleStatusChange(poll.id, 'live')}
                                        className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500"
                                    >
                                        Launch
                                    </button>
                                )}
                                {poll.status === 'live' && (
                                    <button
                                        onClick={() => handleStatusChange(poll.id, 'closed')}
                                        className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-500"
                                    >
                                        Close
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(poll.id)}
                                    className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-red-400"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
