import { AttendanceRow, FeedbackRow } from "./types";

/**
 * Convert attendance data to CSV format
 */
export function exportAttendanceToCSV(attendance: AttendanceRow[]): void {
  const headers = ["ID", "Event ID", "Session ID", "User ID", "Check-in Time", "Created At"];
  const rows = attendance.map((row) => [
    row.id,
    row.event_id,
    row.session_id || "",
    row.user_id,
    row.check_in_time,
    row.created_at,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `attendance_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convert feedback data to CSV format
 */
export function exportFeedbackToCSV(feedback: FeedbackRow[]): void {
  const headers = [
    "ID",
    "Event ID",
    "Session ID",
    "User ID",
    "Rating",
    "Comment",
    "Created At",
  ];
  const rows = feedback.map((row) => [
    row.id,
    row.event_id,
    row.session_id || "",
    row.user_id,
    row.rating?.toString() || "",
    row.comment?.replace(/"/g, '""') || "", // Escape quotes in CSV
    row.created_at,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `feedback_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

