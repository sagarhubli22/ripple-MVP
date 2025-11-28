import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get auth header from client
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user
        const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            global: {
                headers: {
                    Authorization: authHeader,
                },
            },
        });

        const {
            data: { user },
            error: authError,
        } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse request body
        const body = await req.json();
        const { eventId, sessionId, rating, comment } = body;

        if (!eventId) {
            return NextResponse.json(
                { error: "Event ID is required" },
                { status: 400 }
            );
        }

        // Get event owner's plan
        const { data: event } = await supabase
            .from("events")
            .select("owner_id")
            .eq("id", eventId)
            .single();

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("plan")
            .eq("id", event.owner_id)
            .single();

        const plan = profile?.plan || "free";

        // Check feedback limit for free users
        if (plan === "free") {
            const { data: feedbackList, error: feedbackError } = await supabase
                .from("feedback")
                .select("id")
                .eq("event_id", eventId);

            if (feedbackError) {
                return NextResponse.json(
                    { error: "Failed to check feedback limit" },
                    { status: 500 }
                );
            }

            if (feedbackList && feedbackList.length >= 30) {
                return NextResponse.json(
                    {
                        error: "LIMIT_REACHED",
                        message: "Response limit reached. Upgrade to continue collecting feedback.",
                    },
                    { status: 403 }
                );
            }
        }

        // Create feedback
        const payload: {
            event_id: string;
            session_id?: string | null;
            user_id: string;
            rating?: number | null;
            comment?: string | null;
        } = {
            event_id: eventId,
            user_id: user.id,
        };

        if (sessionId) {
            payload.session_id = sessionId;
        }

        if (typeof rating === "number") {
            payload.rating = rating;
        }

        if (comment && comment.trim()) {
            payload.comment = comment.trim();
        }

        const { data, error } = await supabase.from("feedback").insert([payload]).select().single();

        if (error) {
            return NextResponse.json(
                { error: "Failed to submit feedback", details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ feedback: data });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
