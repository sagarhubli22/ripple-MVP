import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabaseServer";

// POST /api/polls/[pollId]/responses - Submit a poll response
export async function POST(
    req: NextRequest,
    { params }: { params: { pollId: string } }
) {
    try {
        const { pollId } = params;
        const { attendee_identifier, selected_option } = await req.json();

        if (!attendee_identifier || !selected_option) {
            return NextResponse.json(
                { error: "attendee_identifier and selected_option are required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 }
            );
        }

        // Insert response (will fail if duplicate due to unique constraint)
        const { data, error } = await supabase
            .from("poll_responses")
            .insert([
                {
                    poll_id: pollId,
                    attendee_identifier,
                    selected_option,
                },
            ])
            .select()
            .single();

        if (error) {
            // Check if it's a duplicate response
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: "You have already responded to this poll" },
                    { status: 409 }
                );
            }

            console.error("Failed to submit poll response:", error);
            return NextResponse.json(
                { error: "Failed to submit response" },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("Error in POST /api/polls/[pollId]/responses:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET /api/polls/[pollId]/responses - Get response statistics
export async function GET(
    req: NextRequest,
    { params }: { params: { pollId: string } }
) {
    try {
        const { pollId } = params;

        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 }
            );
        }

        // Get all responses for this poll
        const { data: responses, error } = await supabase
            .from("poll_responses")
            .select("*")
            .eq("poll_id", pollId);

        if (error) {
            console.error("Failed to fetch poll responses:", error);
            return NextResponse.json(
                { error: "Failed to fetch responses" },
                { status: 500 }
            );
        }

        // Calculate statistics
        const stats: Record<string, number> = {};
        let totalResponses = 0;

        (responses || []).forEach((response: any) => {
            const option = response.selected_option;
            stats[option] = (stats[option] || 0) + 1;
            totalResponses++;
        });

        return NextResponse.json({
            totalResponses,
            stats,
            responses: responses || [],
        });
    } catch (err) {
        console.error("Error in GET /api/polls/[pollId]/responses:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
