import { Session, FeedbackRow, AttendanceRow, SessionWithStats } from "./types";

/**
 * Calculate average rating from feedback rows, ignoring nulls
 */
export function calculateAverageRating(feedback: FeedbackRow[]): number {
  const ratings = feedback.map((f) => f.rating).filter((r) => r !== null) as number[];
  if (ratings.length === 0) return 0;
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

/**
 * Calculate rating distribution (count of each rating 1-5)
 */
export function calculateRatingDistribution(feedback: FeedbackRow[]): Record<number, number> {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  feedback.forEach((f) => {
    if (f.rating !== null && f.rating >= 1 && f.rating <= 5) {
      distribution[f.rating]++;
    }
  });
  return distribution;
}

/**
 * Group attendance by session_id
 */
export function groupAttendanceBySession(
  attendance: AttendanceRow[]
): Record<string | "general", AttendanceRow[]> {
  const grouped: Record<string | "general", AttendanceRow[]> = {
    general: [],
  };

  attendance.forEach((row) => {
    const key = row.session_id || "general";
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(row);
  });

  return grouped;
}

/**
 * Get distinct user count from attendance rows
 */
export function getDistinctAttendeeCount(attendance: AttendanceRow[]): number {
  const uniqueUserIds = new Set(attendance.map((a) => a.user_id));
  return uniqueUserIds.size;
}

/**
 * Calculate engagement score for a session
 * engagementScore = (normalized attendance * 0.5 + normalized rating * 0.5)
 */
export function calculateEngagementScore(
  session: Session,
  allSessions: Session[],
  attendance: AttendanceRow[],
  feedback: FeedbackRow[]
): number {
  // Get attendance for this session
  const sessionAttendance = attendance.filter((a) => a.session_id === session.id);
  const attendeeCount = getDistinctAttendeeCount(sessionAttendance);

  // Get feedback for this session
  const sessionFeedback = feedback.filter((f) => f.session_id === session.id);
  const avgRating = calculateAverageRating(sessionFeedback);

  // Normalize attendance (0-100)
  const allAttendeeCounts = allSessions.map((s) => {
    const sAttendance = attendance.filter((a) => a.session_id === s.id);
    return getDistinctAttendeeCount(sAttendance);
  });
  const maxAttendance = Math.max(...allAttendeeCounts, 1);
  const normalizedAttendance = (attendeeCount / maxAttendance) * 100;

  // Normalize rating (0-100, assuming 1-5 scale)
  const normalizedRating = ((avgRating - 1) / 4) * 100;

  // Calculate engagement score
  return normalizedAttendance * 0.5 + normalizedRating * 0.5;
}

/**
 * Calculate session stats for comparison
 */
export function calculateSessionStats(
  sessions: Session[],
  attendance: AttendanceRow[],
  feedback: FeedbackRow[]
): SessionWithStats[] {
  return sessions.map((session) => {
    const sessionAttendance = attendance.filter((a) => a.session_id === session.id);
    const sessionFeedback = feedback.filter((f) => f.session_id === session.id);

    const attendeeCount = getDistinctAttendeeCount(sessionAttendance);
    const averageRating = calculateAverageRating(sessionFeedback);
    const feedbackCount = sessionFeedback.length;
    const engagementScore = calculateEngagementScore(session, sessions, attendance, feedback);

    return {
      session,
      attendeeCount,
      averageRating,
      feedbackCount,
      engagementScore,
    };
  });
}

