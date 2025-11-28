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

        // Get user's plan
        const { data: profile } = await supabase
            .from("profiles")
            .select("plan")
            .eq("id", user.id)
            .single();

        const plan = profile?.plan || "free";

        // Check event limit for free users
        if (plan === "free") {
            const { data: events, error: eventsError } = await supabase
                .from("events")
                .select("id")
                .eq("owner_id", user.id);

            if (eventsError) {
                return NextResponse.json(
                    { error: "Failed to check event limit" },
                    { status: 500 }
                );
            }

            if (events && events.length >= 1) {
                return NextResponse.json(
                    {
                        error: "LIMIT_REACHED",
                        message: "You've reached your limit on the free plan. Upgrade to Pro to create more events.",
                    },
                    { status: 403 }
                );
            }
        }

        // Parse request body
        const body = await req.json();
        const { name, description, date } = body;

        if (!name || !name.trim()) {
            return NextResponse.json(
                { error: "Event name is required" },
                { status: 400 }
            );
        }

        // Create event
        const payload: {
            name: string;
            owner_id: string;
            description?: string | null;
            date?: string | null;
        } = {
            name: name.trim(),
            owner_id: user.id,
        };

        if (description && description.trim()) {
            payload.description = description.trim();
        }

        if (date) {
            payload.date = date;
        }

        const { data, error } = await supabase
            .from("events")
            .insert([payload])
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { error: "Failed to create event", details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ event: data });
    } catch (error) {
        console.error("Error creating event:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
