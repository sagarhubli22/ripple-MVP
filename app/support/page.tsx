"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthGuard } from "../../components/AuthGuard";

export default function SupportPage() {
    const [bugMessage, setBugMessage] = useState("");
    const [featureMessage, setFeatureMessage] = useState("");
    const [bugLoading, setBugLoading] = useState(false);
    const [featureLoading, setFeatureLoading] = useState(false);
    const [bugSuccess, setBugSuccess] = useState(false);
    const [featureSuccess, setFeatureSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (type: 'bug' | 'feature') => {
        const message = type === 'bug' ? bugMessage : featureMessage;
        const setLoading = type === 'bug' ? setBugLoading : setFeatureLoading;
        const setSuccess = type === 'bug' ? setBugSuccess : setFeatureSuccess;
        const setMessage = type === 'bug' ? setBugMessage : setFeatureMessage;

        if (!message.trim()) return;

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch("/api/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message,
                    type,
                    event_id: null // Global support page, no specific event context
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Support submission error:", errorData);
                throw new Error(errorData.details || errorData.error || "Failed to submit message");
            }

            setSuccess(true);
            setMessage("");
            setTimeout(() => setSuccess(false), 5000);
        } catch (err) {
            console.error("Form submission error:", err);
            setError(err instanceof Error ? err.message : "Failed to send message. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto max-w-3xl px-4 py-12">
                <h1 className="mb-8 text-3xl font-bold text-white">Support</h1>

                {/* Contact Info */}
                <section className="mb-10 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
                    <h2 className="mb-4 text-xl font-semibold text-white">Contact Us</h2>
                    <div className="space-y-2 text-slate-300">
                        <p>
                            Email: <a href="mailto:sagarhubli22@gmail.com" className="text-indigo-400 hover:text-indigo-300">sagarhubli22@gmail.com</a>
                        </p>
                        <p className="text-sm text-slate-400">We usually reply within 24 hours.</p>
                        <div className="mt-4 flex gap-4">
                            <a
                                href="https://x.com/sagar_hubli"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300"
                            >
                                Follow on X (Twitter)
                            </a>
                            <Link href="/faq" className="text-indigo-400 hover:text-indigo-300">
                                FAQ
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Troubleshooting */}
                <section className="mb-10">
                    <h2 className="mb-4 text-xl font-semibold text-white">Quick Troubleshooting</h2>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
                        <ul className="list-inside list-disc space-y-2 text-slate-300">
                            <li>Refresh the page to ensure you have the latest updates.</li>
                            <li>Check that you are using the correct Event ID.</li>
                            <li>If the QR code isn't working, try re-scanning or using the direct link.</li>
                            <li>Verify your AI credits in Settings if smart features aren't working.</li>
                        </ul>
                    </div>
                </section>

                {/* Forms Grid */}
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Bug Report */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-white">Report a Bug</h2>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
                            <div className="mb-4">
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Describe the issue
                                </label>
                                <textarea
                                    value={bugMessage}
                                    onChange={(e) => setBugMessage(e.target.value)}
                                    rows={4}
                                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="What happened? What did you expect?"
                                />
                            </div>
                            <button
                                onClick={() => handleSubmit('bug')}
                                disabled={bugLoading || !bugMessage.trim()}
                                className="w-full rounded-md bg-red-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                            >
                                {bugLoading ? "Sending..." : "Submit Bug Report"}
                            </button>
                            {bugSuccess && (
                                <p className="mt-2 text-sm text-green-400">Bug report sent! Thank you.</p>
                            )}
                        </div>
                    </section>

                    {/* Feature Request */}
                    <section>
                        <h2 className="mb-4 text-xl font-semibold text-white">Request a Feature</h2>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
                            <div className="mb-4">
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Feature request
                                </label>
                                <textarea
                                    value={featureMessage}
                                    onChange={(e) => setFeatureMessage(e.target.value)}
                                    rows={4}
                                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="What would make Ripple better?"
                                />
                            </div>
                            <button
                                onClick={() => handleSubmit('feature')}
                                disabled={featureLoading || !featureMessage.trim()}
                                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                            >
                                {featureLoading ? "Sending..." : "Submit Request"}
                            </button>
                            {featureSuccess && (
                                <p className="mt-2 text-sm text-green-400">Feature request sent! We'll look into it.</p>
                            )}
                        </div>
                    </section>
                </div>

                {error && (
                    <div className="mt-6 rounded-md border border-red-500/50 bg-red-500/10 p-4 text-center text-red-400">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
