import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // apiVersion: "2025-10-24.acacia", // Removed invalid version
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const signature = req.headers.get("stripe-signature");

        if (!signature) {
            return NextResponse.json(
                { error: "Missing stripe-signature header" },
                { status: 400 }
            );
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            console.error("Webhook signature verification failed:", err);
            return NextResponse.json(
                { error: "Webhook signature verification failed" },
                { status: 400 }
            );
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId;
                const subscriptionId = session.subscription as string;

                if (userId && subscriptionId) {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

                    await supabaseAdmin
                        .from("profiles")
                        .update({
                            plan: "pro",
                            subscription_status: "active",
                            stripe_customer_id: session.customer as string,
                            current_period_end: new Date(
                                (subscription as any).current_period_end * 1000
                            ).toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", userId);

                    console.log(`Subscription activated for user ${userId}`);
                }
                break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;

                // Find user by customer ID
                const { data: profile } = await supabaseAdmin
                    .from("profiles")
                    .select("id")
                    .eq("stripe_customer_id", subscription.customer as string)
                    .single();

                if (profile) {
                    const status = subscription.status;
                    const plan = status === "active" ? "pro" : "free";

                    await supabaseAdmin
                        .from("profiles")
                        .update({
                            plan: plan,
                            subscription_status: status,
                            current_period_end: new Date(
                                (subscription as any).current_period_end * 1000
                            ).toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", profile.id);

                    console.log(`Subscription ${status} for user ${profile.id}`);
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;

                // Find user by customer ID
                const { data: profile } = await supabaseAdmin
                    .from("profiles")
                    .select("id")
                    .eq("stripe_customer_id", subscription.customer as string)
                    .single();

                if (profile) {
                    await supabaseAdmin
                        .from("profiles")
                        .update({
                            plan: "free",
                            subscription_status: "canceled",
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", profile.id);

                    console.log(`Subscription canceled for user ${profile.id}`);
                }
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Error handling webhook:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
