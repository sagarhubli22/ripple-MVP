import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // apiVersion: "2025-10-24.acacia", // Removed invalid version
});

export async function POST(req: NextRequest) {
    try {
        // 1. Setup Supabase Auth Helper
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

        // 2. Authenticate User
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        console.log("DEBUG: Cookies present:", cookieStore.getAll().map(c => c.name));
        console.log("DEBUG: Auth User:", user?.id);
        console.log("DEBUG: Auth Error:", authError);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized", details: authError }, { status: 401 });
        }

        // 3. Load Profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("stripe_customer_id, email, plan")
            .eq("id", user.id)
            .single();

        if (profileError) {
            console.error("Error fetching profile:", profileError);
            // If profile doesn't exist, we might want to create it or just error out.
            // For now, let's assume we can proceed if we can create a customer, 
            // but strictly speaking we need a place to store the customer ID.
            // If profile is missing, we can't store it.
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        let customerId = profile?.stripe_customer_id;

        // 4. Create/Get Stripe Customer
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id,
                },
            });
            customerId = customer.id;

            // Update profile with new customer ID
            // Using service role key here to ensure we can write to the profile even if RLS is strict
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const { error: updateError } = await supabaseAdmin
                .from("profiles")
                .update({ stripe_customer_id: customerId })
                .eq("id", user.id);

            if (updateError) {
                console.error("Error updating profile with stripe_customer_id:", updateError);
                return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
            }
        }

        // 5. Create Checkout Session
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
            ? process.env.NEXT_PUBLIC_SITE_URL
            : "http://localhost:3000";

        const success_url = `${baseUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
        const cancel_url = `${baseUrl}/billing?canceled=true`;

        console.log("DEBUG Stripe URLs:", { success_url, cancel_url, return_url: baseUrl });

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            success_url,
            cancel_url,
            metadata: {
                userId: user.id,
            },
        });

        // 6. Return URL
        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error("Error creating checkout session:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
