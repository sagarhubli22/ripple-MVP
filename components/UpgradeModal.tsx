"use client";

import { useState } from "react";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
}

export function UpgradeModal({
    isOpen,
    onClose,
    title = "Upgrade to Pro",
    message = "You've reached the limit of the Free plan. Upgrade to Pro to unlock unlimited events, responses, and AI insights.",
}: UpgradeModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleUpgrade = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
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
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-indigo-500/50 bg-slate-900 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-center">
                    <div className="rounded-full bg-indigo-500/20 p-3">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-indigo-400"
                        >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </div>
                </div>

                <h3 className="mb-2 text-center text-xl font-bold text-white">{title}</h3>
                <p className="mb-6 text-center text-sm text-slate-300">{message}</p>

                {error && (
                    <div className="mb-4 rounded-md bg-red-500/20 border border-red-500/50 p-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleUpgrade}
                        disabled={loading}
                        className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Processing..." : "Upgrade to Pro – $19/mo"}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full rounded-lg border border-slate-700 bg-transparent px-4 py-2.5 font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
