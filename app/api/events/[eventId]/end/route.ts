import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
    request: NextRequest,
    { params }: { params: { eventId: string } }
) {
    try {
        const eventId = params.eventId;

        if (!eventId) {
            return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get auth header
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify ownership
        const { data: event, error: eventError } = await supabase
            .from("events")
            .select("owner_id")
            .eq("id", eventId)
            .single();

        if (eventError || !event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        if (event.owner_id !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Update event status
        const { data, error: updateError } = await supabase
            .from("events")
            .update({
                status: "ended",
                ended_at: new Date().toISOString(),
            })
            .eq("id", eventId)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json(
                { error: "Failed to end event", details: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ event: data });
    } catch (error) {
        console.error("Error ending event:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
