import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Event, Session, FeedbackRow, AttendanceRow } from "../../../lib/analytics/types";
import {
  calculateAverageRating,
  getDistinctAttendeeCount,
  calculateRatingDistribution,
} from "../../../lib/analytics/utils";

export async function POST(request: NextRequest) {
  try {
    // Handle JSON parsing errors
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error("JSON parsing error:", e);
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          details: e instanceof Error ? e.message : "Unknown parsing error",
        },
        { status: 400 }
      );
    }

    const { eventId } = body;

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    // Initialize Supabase client for user authentication
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase public configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // Get user from auth header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initialize Supabase server client (with service role key)
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch all event data in parallel
    const [eventResult, sessionsResult, feedbackResult, attendanceResult] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("sessions").select("*").eq("event_id", eventId).order("start_time", {
        ascending: true,
      }),
      supabase.from("feedback").select("*").eq("event_id", eventId),
      supabase.from("attendance").select("*").eq("event_id", eventId),
    ]);

    if (eventResult.error) {
      console.error("Error fetching event:", eventResult.error);
      return NextResponse.json(
        { error: "Failed to load event data", details: eventResult.error.message },
        { status: 500 }
      );
    }

    if (sessionsResult.error) {
      console.error("Error fetching sessions:", sessionsResult.error);
      return NextResponse.json(
        { error: "Failed to load event data", details: sessionsResult.error.message },
        { status: 500 }
      );
    }

    if (feedbackResult.error) {
      console.error("Error fetching feedback:", feedbackResult.error);
      return NextResponse.json(
        { error: "Failed to load event data", details: feedbackResult.error.message },
        { status: 500 }
      );
    }

    if (attendanceResult.error) {
      console.error("Error fetching attendance:", attendanceResult.error);
      return NextResponse.json(
        { error: "Failed to load event data", details: attendanceResult.error.message },
        { status: 500 }
      );
    }

    // Check user plan and limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan || "free";

    if (plan === "free") {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("summary_generated_count")
        .eq("id", eventId)
        .single();

      if (eventError || !eventData) {
        return NextResponse.json(
          { error: "Failed to check summary limit" },
          { status: 500 }
        );
      }

      if ((eventData.summary_generated_count || 0) >= 1) {
        return NextResponse.json(
          {
            error: "LIMIT_REACHED",
            message: "You've reached your limit on the free plan. Upgrade to Pro for unlimited AI summaries.",
          },
          { status: 403 }
        );
      }
    }

    const event: Event = eventResult.data;
    const sessions: Session[] = sessionsResult.data || [];
    const feedback: FeedbackRow[] = feedbackResult.data || [];
    const attendance: AttendanceRow[] = attendanceResult.data || [];

    // Calculate statistics
    const totalAttendees = getDistinctAttendeeCount(attendance);
    const averageRating = calculateAverageRating(feedback);
    const ratingDistribution = calculateRatingDistribution(feedback);
    const sessionCount = sessions.length;
    const feedbackCount = feedback.length;

    // Group attendance by session
    const attendanceBySession: Record<string, number> = {};
    sessions.forEach((session) => {
      const sessionAttendance = attendance.filter((a) => a.session_id === session.id);
      attendanceBySession[session.id] = getDistinctAttendeeCount(sessionAttendance);
    });

    // Calculate per-session feedback
    const sessionFeedback: Record<string, { count: number; avgRating: number }> = {};
    sessions.forEach((session) => {
      const sessionFeedbackRows = feedback.filter((f) => f.session_id === session.id);
      sessionFeedback[session.id] = {
        count: sessionFeedbackRows.length,
        avgRating: calculateAverageRating(sessionFeedbackRows),
      };
    });

    // Build the prompt
    const formatDate = (date: string | null) => {
      if (!date) return "No date set";
      try {
        return new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return "Invalid date";
      }
    };

    let prompt = `Event Analytics Summary:\n\n`;
    prompt += `Event: ${event.name}\n`;
    prompt += `Date: ${formatDate(event.date)}\n`;
    if (event.description) {
      prompt += `Description: ${event.description}\n`;
    }
    prompt += `\nOverall Statistics:\n`;
    prompt += `- Total Sessions: ${sessionCount}\n`;
    prompt += `- Total Unique Attendees: ${totalAttendees}\n`;
    prompt += `- Total Feedback Responses: ${feedbackCount}\n`;
    if (averageRating > 0) {
      prompt += `- Average Rating: ${averageRating.toFixed(1)}/5.0\n`;
      prompt += `- Rating Distribution: 1★:${ratingDistribution[1]} 2★:${ratingDistribution[2]} 3★:${ratingDistribution[3]} 4★:${ratingDistribution[4]} 5★:${ratingDistribution[5]}\n`;
    } else {
      prompt += `- Average Rating: No ratings yet\n`;
    }

    if (sessions.length > 0) {
      prompt += `\nSession Breakdown:\n`;
      sessions.forEach((session) => {
        const attendees = attendanceBySession[session.id] || 0;
        const feedback = sessionFeedback[session.id] || { count: 0, avgRating: 0 };
        prompt += `- ${session.title}: ${attendees} attendees`;
        if (feedback.count > 0) {
          prompt += `, ${feedback.count} feedback responses, avg rating ${feedback.avgRating.toFixed(1)}/5.0`;
        }
        if (session.start_time) {
          prompt += ` (${new Date(session.start_time).toLocaleDateString()})`;
        }
        prompt += `\n`;
      });
    }

    prompt += `\nPlease provide a concise, actionable summary of this event's performance, highlighting key insights, strengths, and areas for improvement.`;

    // Call xAI API
    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      console.error("XAI_API_KEY not configured");
      return NextResponse.json(
        { error: "AI service not configured", details: "Missing XAI_API_KEY" },
        { status: 500 }
      );
    }

    let xaiResponse;
    try {
      xaiResponse = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${xaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-3-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert in analysing event analytics. Be concise and actionable.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });
    } catch (fetchError) {
      console.error("Network error calling xAI API:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to connect to AI service",
          details: fetchError instanceof Error ? fetchError.message : "Unknown network error",
        },
        { status: 500 }
      );
    }

    if (!xaiResponse.ok) {
      const status = xaiResponse.status;
      let errorBody: any = {};
      let details = "";

      try {
        const text = await xaiResponse.text();
        try {
          errorBody = JSON.parse(text);
          // If the error body is a JSON object, try to extract meaningful details
          if (errorBody.error) {
            if (typeof errorBody.error === "string") {
              details = errorBody.error;
            } else if (typeof errorBody.error === "object") {
              // Handle nested error objects (e.g. { error: { message: "..." } })
              details = JSON.stringify(errorBody.error);
            } else {
              details = JSON.stringify(errorBody);
            }
          } else {
            details = text; // Fallback to full text if no 'error' field
          }
        } catch {
          details = text; // Fallback if JSON parse fails
        }
      } catch (e) {
        details = "Could not read error response body";
      }

      console.error(`xAI API error (${status}):`, details);

      // Map common status codes to clear messages
      let userMessage = "An error occurred while generating the summary.";
      if (status === 400) {
        userMessage = "Invalid request to xAI API.";
      } else if (status === 401) {
        userMessage = "Invalid or missing XAI_API_KEY.";
      } else if (status === 402) {
        userMessage =
          "Billing is not enabled or you have insufficient quota. Add credits in the xAI console.";
      } else if (status === 429) {
        userMessage = "Rate limit exceeded. Please try again later.";
      } else if (status >= 500) {
        userMessage = "xAI server error. Please try again later.";
      }

      return NextResponse.json(
        { error: userMessage, details: details },
        { status: status }
      );
    }

    const xaiData = await xaiResponse.json();
    const summary = xaiData.choices?.[0]?.message?.content;

    if (!summary) {
      console.error("Invalid response from xAI API:", xaiData);
      return NextResponse.json(
        {
          error: "Failed to generate summary",
          details: "Invalid response format from AI provider",
        },
        { status: 500 }
      );
    }

    // Increment summary generated count
    await supabase.rpc("increment_summary_count", { event_id_param: eventId });

    return NextResponse.json({
      summary,
      stats: {
        totalAttendees,
        averageRating,
        feedbackCount,
      },
      feedback: feedback.map(f => ({
        rating: f.rating,
        comment: f.comment,
        created_at: f.created_at,
        sentiment: f.sentiment
      })),
      event: {
        name: event.name,
        date: event.date,
        ended_at: event.ended_at
      }
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
