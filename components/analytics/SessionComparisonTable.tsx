import { SessionWithStats } from "../../lib/analytics/types";

interface SessionComparisonTableProps {
  sessionStats: SessionWithStats[];
}

export function SessionComparisonTable({ sessionStats }: SessionComparisonTableProps) {
  // Find the best performing session
  const bestScore = Math.max(...sessionStats.map((s) => s.engagementScore));
  const bestSessionIds = sessionStats
    .filter((s) => s.engagementScore === bestScore)
    .map((s) => s.session.id);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Session</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Attendees</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Avg Rating</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
              Engagement Score
            </th>
          </tr>
        </thead>
        <tbody>
          {sessionStats.map((stat) => {
            const isBest = bestSessionIds.includes(stat.session.id);
            return (
              <tr
                key={stat.session.id}
                className={`border-b border-slate-800/50 ${
                  isBest ? "bg-indigo-500/10" : ""
                }`}
              >
                <td className="px-4 py-3 text-sm text-white">
                  {stat.session.title}
                  {isBest && (
                    <span className="ml-2 text-xs text-indigo-400">★ Best</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-white">{stat.attendeeCount}</td>
                <td className="px-4 py-3 text-sm text-white">
                  {stat.averageRating > 0 ? stat.averageRating.toFixed(1) : "N/A"}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-white">
                  {stat.engagementScore.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

