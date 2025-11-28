"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "../../components/AuthGuard";
import { getSupabaseClient } from "../../lib/supabaseClient";

interface Profile {
    plan: string;
    subscription_status: string | null;
    current_period_end: string | null;
}

export default function BillingPage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = getSupabaseClient();

    useEffect(() => {
        if (!supabase) {
            setError("Supabase client not configured");
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser();

                if (userError) throw userError;
                if (!user) {
                    setError("No user found");
                    setLoading(false);
                    return;
                }

                const { data, error: profileError } = await supabase
                    .from("profiles")
                    .select("plan, subscription_status, current_period_end")
                    .eq("id", user.id)
                    .single();

                if (profileError) throw profileError;

                setProfile(data);
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to fetch profile");
                setLoading(false);
            }
        };

        fetchProfile();

        // Check for success/canceled query params
        const query = new URLSearchParams(window.location.search);
        if (query.get("success")) {
            // Ideally we would show a toast or a success message here
            // For now, let's just clear the error
            setError(null);
        }
        if (query.get("canceled")) {
            setError("Order canceled -- continue to shop around and checkout when you're ready.");
        }
    }, [supabase]);

    const handleUpgrade = async () => {
        setUpgrading(true);
        setError(null);

        console.log("DEBUG: Client Cookies:", document.cookie);

        try {
            const response = await fetch("/api/stripe/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to create checkout session");
            }

            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            }
        } catch (err) {
            console.error("Error upgrading:", err);
            setError(err instanceof Error ? err.message : "Something went wrong");
            setUpgrading(false);
        }
    };

    if (loading) {
        return (
            <AuthGuard>
                <section className="space-y-6">
                    <h1 className="text-3xl font-semibold tracking-tight text-white">
                        Billing
                    </h1>
                    <div className="text-slate-400">Loading...</div>
                </section>
            </AuthGuard>
        );
    }

    const plan = profile?.plan || "free";
    const isPro = plan === "pro";

    return (
        <AuthGuard>
            <section className="space-y-6">
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                    Billing
                </h1>

                {error && (
                    <div className="rounded-md bg-red-500/20 border border-red-500/50 p-4 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-white mb-2">Current Plan</h2>
                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ${isPro
                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50"
                                : "bg-slate-700/50 text-slate-300 border border-slate-700"
                                }`}>
                                {isPro ? "Pro Plan" : "Free Plan"}
                            </span>
                            {isPro && profile?.subscription_status && (
                                <span className="text-sm text-slate-400">
                                    Status: <span className="capitalize">{profile.subscription_status}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {isPro ? (
                        <div className="space-y-4">
                            {profile?.current_period_end && (
                                <div className="text-sm text-slate-300">
                                    <span className="text-slate-400">Renewal date:</span>{" "}
                                    {new Date(profile.current_period_end).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </div>
                            )}
                            <div className="pt-4 border-t border-slate-800">
                                <h3 className="font-semibold text-white mb-2">Pro Features</h3>
                                <ul className="space-y-2 text-sm text-slate-300">
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Unlimited events
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Unlimited responses
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Unlimited AI summaries
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        All analytics unlocked
                                    </li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-sm text-slate-300 space-y-1">
                                <p>Free plan includes:</p>
                                <ul className="list-disc list-inside space-y-1 text-slate-400">
                                    <li>1 active event</li>
                                    <li>30 feedback responses per event</li>
                                    <li>1 AI summary per event</li>
                                </ul>
                            </div>
                            <div className="pt-4 border-t border-slate-800">
                                <button
                                    onClick={handleUpgrade}
                                    disabled={upgrading}
                                    className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {upgrading ? "Processing..." : "Upgrade to Pro – $19/month"}
                                </button>
                                <div className="mt-4 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                                    <h3 className="font-semibold text-white mb-2">Pro Features</h3>
                                    <ul className="space-y-2 text-sm text-slate-300">
                                        <li className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Unlimited events
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Unlimited responses
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Unlimited AI summaries
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            All analytics unlocked
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </AuthGuard>
    );
}
