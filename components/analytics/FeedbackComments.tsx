"use client";

import { useState } from "react";
import { Session, FeedbackRow } from "../../lib/analytics/types";

interface FeedbackCommentsProps {
  sessions: Session[];
  feedback: FeedbackRow[];
}

export function FeedbackComments({ sessions, feedback }: FeedbackCommentsProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  const filteredFeedback = feedback.filter((f) => {
    if (!searchQuery.trim()) return true;
    const comment = f.comment?.toLowerCase() || "";
    return comment.includes(searchQuery.toLowerCase());
  });

  const getSessionTitle = (sessionId: string | null) => {
    if (!sessionId) return "General event";
    return sessionMap.get(sessionId)?.title || "Unknown session";
  };

  const getSentimentPill = (sentiment: string | null | undefined) => {
    if (!sentiment) return null;

    const styles = {
      positive: "bg-green-500/20 text-green-400 border-green-500/50",
      neutral: "bg-gray-500/20 text-gray-400 border-gray-500/50",
      negative: "bg-red-500/20 text-red-400 border-red-500/50",
    };

    const label = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
    const style = styles[sentiment as keyof typeof styles] || styles.neutral;

    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Comments</h3>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search comments..."
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="max-h-96 space-y-3 overflow-y-auto">
        {filteredFeedback.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            {searchQuery ? "No comments match your search." : "No comments yet."}
          </div>
        ) : (
          filteredFeedback.map((f) => (
            <div
              key={f.id}
              className="rounded-md border border-slate-800 bg-slate-800/40 p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-white">{getSessionTitle(f.session_id)}</div>
                <div className="flex items-center gap-2">
                  {getSentimentPill(f.sentiment)}
                  {f.rating !== null && (
                    <div className="text-sm text-slate-400">{f.rating}★</div>
                  )}
                </div>
              </div>
              {f.comment && (
                <div className="mb-2 text-sm text-slate-300">{f.comment}</div>
              )}
              {f.highlight_insight && (
                <div className="mt-2 text-xs text-slate-400 italic">
                  AI insight: {f.highlight_insight}
                </div>
              )}
              <div className="mt-2 text-xs text-slate-500">
                {new Date(f.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
