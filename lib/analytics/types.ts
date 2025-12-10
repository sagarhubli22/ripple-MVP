export interface Event {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  date: string | null;
  status?: 'active' | 'ended' | 'deleted';
  deleted_at?: string | null;
  ended_at?: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  event_id: string;
  owner_id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

export interface FeedbackRow {
  id: string;
  event_id: string;
  session_id: string | null;
  user_id: string;
  rating: number | null;
  comment: string | null;
  sentiment?: string | null;
  highlight_insight?: string | null;
  highlight_urgency?: number | null;
  created_at: string;
}

export interface AttendanceRow {
  id: string;
  event_id: string;
  session_id: string | null;
  user_id: string;
  check_in_time: string;
  created_at: string;
}

export interface SessionWithStats {
  session: Session;
  attendeeCount: number;
  averageRating: number;
  feedbackCount: number;
  engagementScore: number;
}
