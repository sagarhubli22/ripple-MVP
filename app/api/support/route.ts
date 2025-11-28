import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export async function POST(req: NextRequest) {
    try {
        const { message, type, event_id } = await req.json();

        if (!message || !message.trim()) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        if (!['bug', 'feature'].includes(type)) {
            return NextResponse.json(
                { error: "Invalid message type" },
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

        // Get current user session (if any)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

        const { data, error } = await supabase
            .from("support_messages")
            .insert([
                {
                    user_id: userId,
                    event_id: event_id || null,
                    message: message.trim(),
                    type,
                    // status will default to 'new'
                },
            ]);

        if (error) {
            console.error("Supabase insert error:", error);
            return NextResponse.json(
                {
                    error: "Failed to submit message",
                    details: error.message,
                    hint: error.hint,
                    code: error.code
                },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error("Error in support API:", err);
        return NextResponse.json(
            {
                error: "Internal server error",
                details: err instanceof Error ? err.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
