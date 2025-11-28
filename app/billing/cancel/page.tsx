"use client";

import Link from "next/link";

export default function CancelPage() {
    return (
        <section className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
                <div className="mb-6 flex items-center justify-center">
                    <div className="rounded-full bg-slate-700/50 p-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-slate-400"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    </div>
                </div>

                <h1 className="mb-2 text-2xl font-bold text-white">
                    Upgrade Cancelled
                </h1>
                <p className="mb-6 text-slate-300">
                    No worries! You can upgrade to Pro anytime from your billing page.
                </p>

                <div className="space-y-3">
                    <Link
                        href="/billing"
                        className="block w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
                    >
                        Back to Billing
                    </Link>
                    <Link
                        href="/overview"
                        className="block w-full rounded-lg border border-slate-700 bg-transparent px-6 py-3 font-medium text-slate-300 transition-colors hover:bg-slate-800"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        </section>
    );
}
