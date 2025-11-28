import { Session, AttendanceRow } from "../../lib/analytics/types";
import { groupAttendanceBySession, getDistinctAttendeeCount } from "../../lib/analytics/utils";

interface AttendanceTableProps {
  sessions: Session[];
  attendance: AttendanceRow[];
}

export function AttendanceTable({ sessions, attendance }: AttendanceTableProps) {
  const grouped = groupAttendanceBySession(attendance);

  // Sort sessions by start_time
  const sortedSessions = [...sessions].sort((a, b) => {
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  const formatTime = (time: string | null) => {
    if (!time) return "—";
    return new Date(time).toLocaleString();
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Session</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Start Time</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">End Time</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Attendees</th>
          </tr>
        </thead>
        <tbody>
          {sortedSessions.map((session) => {
            const sessionAttendance = grouped[session.id] || [];
            const attendeeCount = getDistinctAttendeeCount(sessionAttendance);
            return (
              <tr key={session.id} className="border-b border-slate-800/50">
                <td className="px-4 py-3 text-sm text-white">{session.title}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{formatTime(session.start_time)}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{formatTime(session.end_time)}</td>
                <td className="px-4 py-3 text-sm text-white">{attendeeCount}</td>
              </tr>
            );
          })}
          {grouped.general && grouped.general.length > 0 && (
            <tr className="border-b border-slate-800/50">
              <td className="px-4 py-3 text-sm text-white">General event check-in</td>
              <td className="px-4 py-3 text-sm text-slate-400">—</td>
              <td className="px-4 py-3 text-sm text-slate-400">—</td>
              <td className="px-4 py-3 text-sm text-white">
                {getDistinctAttendeeCount(grouped.general)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

