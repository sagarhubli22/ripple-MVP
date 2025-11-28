"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SuccessPage() {
    const router = useRouter();

    useEffect(() => {
        // Optionally redirect after a few seconds
        const timeout = setTimeout(() => {
            router.push("/billing");
        }, 5000);

        return () => clearTimeout(timeout);
    }, [router]);

    return (
        <section className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md rounded-xl border border-green-500/50 bg-slate-900 p-8 text-center shadow-2xl">
                <div className="mb-6 flex items-center justify-center">
                    <div className="rounded-full bg-green-500/20 p-4">
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
                            className="text-green-400"
                        >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                </div>

                <h1 className="mb-2 text-2xl font-bold text-white">
                    Welcome to Ripple Pro!
                </h1>
                <p className="mb-6 text-slate-300">
                    Your subscription is now active. You have full access to all Pro features.
                </p>

                <div className="space-y-3">
                    <Link
                        href="/billing"
                        className="block w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
                    >
                        View Billing Details
                    </Link>
                    <Link
                        href="/overview"
                        className="block w-full rounded-lg border border-slate-700 bg-transparent px-6 py-3 font-medium text-slate-300 transition-colors hover:bg-slate-800"
                    >
                        Go to Dashboard
                    </Link>
                </div>

                <p className="mt-6 text-xs text-slate-400">
                    Redirecting to billing in 5 seconds...
                </p>
            </div>
        </section>
    );
}
