"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Session, AttendanceRow } from "../../lib/analytics/types";
import { groupAttendanceBySession, getDistinctAttendeeCount } from "../../lib/analytics/utils";

interface AttendanceChartProps {
  sessions: Session[];
  attendance: AttendanceRow[];
}

export function AttendanceChart({ sessions, attendance }: AttendanceChartProps) {
  const grouped = groupAttendanceBySession(attendance);
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  // Prepare chart data
  const chartData = sessions
    .map((session) => {
      const sessionAttendance = grouped[session.id] || [];
      return {
        name: session.title,
        attendees: getDistinctAttendeeCount(sessionAttendance),
      };
    })
    .concat(
      grouped.general && grouped.general.length > 0
        ? [
            {
              name: "General event check-in",
              attendees: getDistinctAttendeeCount(grouped.general),
            },
          ]
        : []
    );

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">Attendance by Session</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="name"
            stroke="#94a3b8"
            angle={-45}
            textAnchor="end"
            height={100}
            fontSize={12}
          />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "0.5rem",
              color: "#f1f5f9",
            }}
          />
          <Bar dataKey="attendees" fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

