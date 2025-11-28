"use client";

import { getSupabaseClient } from "./supabaseClient";

type SubmitFeedbackArgs = {
  eventId: string;
  sessionId?: string | null;
  rating?: number | null;
  comment?: string | null;
};

type CheckInArgs = {
  eventId: string;
  sessionId?: string | null;
};

async function getCurrentUserId() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase client not configured");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("User not authenticated");
  }

  return { supabase, userId: user.id };
}

export const submitFeedback = async (
  eventId: string,
  sessionId: string | null,
  rating: number,
  comment: string
) => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  const response = await fetch("/api/feedback/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      eventId,
      sessionId,
      rating,
      comment,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 403 && data.error === "LIMIT_REACHED") {
      throw new Error(data.message || "Limit reached");
    }
    throw new Error(data.error || "Failed to submit feedback");
  }

  return data.feedback;
};

export async function checkIn({ eventId, sessionId }: CheckInArgs) {
  const { supabase, userId } = await getCurrentUserId();

  const payload: {
    event_id: string;
    session_id?: string | null;
    user_id: string;
  } = {
    event_id: eventId,
    user_id: userId,
  };

  if (sessionId) {
    payload.session_id = sessionId;
  }

  const { error } = await supabase.from("attendance").insert([payload] as any);

  if (error) {
    throw error;
  }
}

