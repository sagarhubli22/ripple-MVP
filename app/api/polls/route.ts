import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import type { Poll } from "../../../lib/polls/types";

// GET /api/polls?eventId=xxx - Get polls for an event
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get("eventId");

        if (!eventId) {
            return NextResponse.json(
                { error: "eventId is required" },
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

        const { data: polls, error } = await supabase
            .from("polls")
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Failed to fetch polls:", error);
            return NextResponse.json(
                { error: "Failed to fetch polls" },
                { status: 500 }
            );
        }

        return NextResponse.json(polls || []);
    } catch (err) {
        console.error("Error in GET /api/polls:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/polls - Create or update a poll
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            id,
            event_id,
            type,
            question,
            option_1,
            option_2,
            option_3,
            status,
        } = body;

        if (!event_id || !type || !question) {
            return NextResponse.json(
                { error: "event_id, type, and question are required" },
                { status: 400 }
            );
        }

        if (!['poll', 'icebreaker'].includes(type)) {
            return NextResponse.json(
                { error: "type must be 'poll' or 'icebreaker'" },
                { status: 400 }
            );
        }

        if (status && !['draft', 'live', 'closed'].includes(status)) {
            return NextResponse.json(
                { error: "status must be 'draft', 'live', or 'closed'" },
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

        const pollData = {
            event_id,
            type,
            question,
            option_1: option_1 || null,
            option_2: option_2 || null,
            option_3: option_3 || null,
            status: status || 'draft',
        };

        let result;

        if (id) {
            // Update existing poll
            const { data, error } = await supabase
                .from("polls")
                .update(pollData)
                .eq("id", id)
                .select()
                .single();

            if (error) {
                console.error("Failed to update poll:", error);
                return NextResponse.json(
                    { error: "Failed to update poll" },
                    { status: 500 }
                );
            }

            result = data;
        } else {
            // Create new poll
            const { data, error } = await supabase
                .from("polls")
                .insert([pollData])
                .select()
                .single();

            if (error) {
                console.error("Failed to create poll:", error);
                return NextResponse.json(
                    { error: "Failed to create poll" },
                    { status: 500 }
                );
            }

            result = data;
        }

        return NextResponse.json(result);
    } catch (err) {
        console.error("Error in POST /api/polls:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH /api/polls - Update poll status or content
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: "id is required" },
                { status: 400 }
            );
        }

        if (updates.status && !['draft', 'live', 'closed'].includes(updates.status)) {
            return NextResponse.json(
                { error: "status must be 'draft', 'live', or 'closed'" },
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

        const { data, error } = await supabase
            .from("polls")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Failed to update poll:", error);
            return NextResponse.json(
                { error: "Failed to update poll" },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("Error in PATCH /api/polls:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/polls?id=xxx - Delete a poll
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "id is required" },
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

        const { error } = await supabase
            .from("polls")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Failed to delete poll:", error);
            return NextResponse.json(
                { error: "Failed to delete poll" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error in DELETE /api/polls:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
