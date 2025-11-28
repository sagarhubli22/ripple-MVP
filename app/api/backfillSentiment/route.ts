/**
 * TEMPORARY BACKFILL ROUTE
 * This route backfills sentiment data for existing feedback rows with NULL sentiment.
 * Run this once in development, then DELETE this file.
 * 
 * Usage: GET /api/backfillSentiment
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "../../../lib/supabaseClient";
import { classifySentimentFromRating } from "../../../lib/sentiment";

export async function GET(req: NextRequest) {
    try {
        const supabase = getSupabaseClient() as any;
        if (!supabase) {
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 }
            );
        }

        // Fetch all feedback rows with NULL sentiment
        const { data: feedbackRows, error: fetchError } = await supabase
            .from("feedback")
            .select("id, rating")
            .is("sentiment", null);

        if (fetchError) {
            console.error("Error fetching feedback:", fetchError);
            return NextResponse.json(
                { error: "Failed to fetch feedback", details: fetchError.message },
                { status: 500 }
            );
        }

        if (!feedbackRows || feedbackRows.length === 0) {
            return NextResponse.json({
                message: "No feedback rows to backfill",
                updated: 0,
            });
        }

        console.log(`Found ${feedbackRows.length} feedback rows with NULL sentiment`);

        let successCount = 0;
        let errorCount = 0;

        // Process each row
        for (const row of feedbackRows) {
            try {
                const sentimentResult = classifySentimentFromRating(row.rating);

                const { error: updateError } = await supabase
                    .from("feedback")
                    .update({
                        sentiment: sentimentResult.sentiment,
                        highlight_insight: sentimentResult.highlightInsight,
                        highlight_urgency: sentimentResult.highlightUrgency,
                    })
                    .eq("id", row.id);

                if (updateError) {
                    console.error(`Failed to update feedback ${row.id}:`, updateError);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                console.error(`Error processing feedback ${row.id}:`, err);
                errorCount++;
            }
        }

        return NextResponse.json({
            message: "Backfill completed",
            total: feedbackRows.length,
            updated: successCount,
            errors: errorCount,
        });
    } catch (err) {
        console.error("Error in backfillSentiment:", err);
        return NextResponse.json(
            {
                error: "Internal server error",
                details: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
