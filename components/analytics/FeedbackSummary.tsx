import { Session, FeedbackRow } from "../../lib/analytics/types";
import { calculateAverageRating, calculateRatingDistribution } from "../../lib/analytics/utils";

interface FeedbackSummaryProps {
  sessions: Session[];
  feedback: FeedbackRow[];
}

export function FeedbackSummary({ sessions, feedback }: FeedbackSummaryProps) {
  const averageRating = calculateAverageRating(feedback);
  const distribution = calculateRatingDistribution(feedback);

  const getSessionFeedback = (sessionId: string | null) => {
    return feedback.filter((f) => f.session_id === sessionId);
  };

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Overall Feedback</h3>
        <div className="mb-4">
          <div className="text-sm text-slate-400">Average Rating</div>
          <div className="mt-1 text-3xl font-semibold text-white">
            {averageRating > 0 ? averageRating.toFixed(1) : "N/A"}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm text-slate-400">Rating Distribution</div>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-3">
                <div className="w-8 text-sm text-slate-300">{rating}★</div>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-indigo-500"
                      style={{
                        width: `${(distribution[rating] / feedback.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-8 text-right text-sm text-slate-400">{distribution[rating]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Feedback by Session</h3>
        <div className="space-y-3">
          {sessions.map((session) => {
            const sessionFeedback = getSessionFeedback(session.id);
            const sessionAvgRating = calculateAverageRating(sessionFeedback);
            return (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-800/40 p-3"
              >
                <div>
                  <div className="font-medium text-white">{session.title}</div>
                  <div className="text-xs text-slate-400">
                    {sessionFeedback.length} feedback {sessionFeedback.length !== 1 ? "entries" : "entry"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">
                    {sessionAvgRating > 0 ? sessionAvgRating.toFixed(1) : "N/A"}
                  </div>
                  <div className="text-xs text-slate-400">avg rating</div>
                </div>
              </div>
            );
          })}
          {getSessionFeedback(null).length > 0 && (
            <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-800/40 p-3">
              <div>
                <div className="font-medium text-white">General event</div>
                <div className="text-xs text-slate-400">
                  {getSessionFeedback(null).length} feedback{" "}
                  {getSessionFeedback(null).length !== 1 ? "entries" : "entry"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-white">
                  {calculateAverageRating(getSessionFeedback(null)).toFixed(1)}
                </div>
                <div className="text-xs text-slate-400">avg rating</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

