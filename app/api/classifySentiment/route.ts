import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export async function POST(req: NextRequest) {
    try {
        const { feedbackId, text, rating } = await req.json();

        // Validate input
        if (!feedbackId) {
            return NextResponse.json(
                { error: "feedbackId is required" },
                { status: 400 }
            );
        }

        let sentiment: string;
        let insight: string;
        let urgency: number;

        const xaiApiKey = process.env.XAI_API_KEY;

        // Try xAI if key is available
        if (xaiApiKey && text && text.trim()) {
            try {
                const xaiResponse = await fetch(
                    "https://api.x.ai/v1/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${xaiApiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: "grok-beta",
                            messages: [
                                {
                                    role: "system",
                                    content:
                                        "You are a helpful assistant that analyzes event feedback. Respond with valid JSON only.",
                                },
                                {
                                    role: "user",
                                    content: `Analyze this feedback and return a JSON object with these exact fields:
{
  "sentiment": "positive" | "neutral" | "negative",
  "insight": "a short one-sentence summary of the key point",
  "urgency": 1-5 (where 5 = needs urgent attention)
}

Feedback (rating: ${rating || "not provided"}):
"${text}"

Respond with only the JSON object, no additional text.`,
                                },
                            ],
                            temperature: 0.3,
                        }),
                    }
                );

                if (xaiResponse.ok) {
                    const data = await xaiResponse.json();
                    const content = data.choices?.[0]?.message?.content;

                    if (content) {
                        // Try to parse JSON response (handle markdown code blocks)
                        let jsonStr = content.trim();
                        const jsonMatch = jsonStr.match(/```json\n?(.*?)\n?```/s) || jsonStr.match(/```\n?(.*?)\n?```/s);
                        if (jsonMatch) {
                            jsonStr = jsonMatch[1];
                        }

                        const parsed = JSON.parse(jsonStr);
                        sentiment = parsed.sentiment;
                        insight = parsed.insight || "";
                        urgency = parsed.urgency || 3;
                    } else {
                        throw new Error("No content in xAI response");
                    }
                } else {
                    // xAI API failed, use fallback
                    console.warn("xAI API failed:", xaiResponse.status);
                    throw new Error("xAI API error");
                }
            } catch (xaiError) {
                console.warn("xAI classification failed, using fallback:", xaiError);
                // Fall through to fallback logic
                const fallback = getRatingBasedSentiment(rating);
                sentiment = fallback.sentiment;
                insight = fallback.insight;
                urgency = fallback.urgency;
            }
        } else {
            // No xAI key or no text, use fallback
            const fallback = getRatingBasedSentiment(rating);
            sentiment = fallback.sentiment;
            insight = fallback.insight;
            urgency = fallback.urgency;
        }

        // Update Supabase
        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 }
            );
        }

        const { error: updateError } = await supabase
            .from("feedback")
            .update({
                sentiment,
                highlight_insight: insight || null,
                highlight_urgency: urgency,
            })
            .eq("id", feedbackId);

        if (updateError) {
            console.error("Failed to update feedback:", updateError);
            return NextResponse.json(
                { error: "Failed to update feedback", details: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            sentiment,
            insight,
            urgency,
        });
    } catch (err) {
        console.error("Error in classifySentiment:", err);
        return NextResponse.json(
            {
                error: "Internal server error",
                details: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

function getRatingBasedSentiment(rating?: number): {
    sentiment: string;
    insight: string;
    urgency: number;
} {
    if (!rating) {
        return {
            sentiment: "neutral",
            insight: "",
            urgency: 3,
        };
    }

    if (rating >= 4) {
        return {
            sentiment: "positive",
            insight: "",
            urgency: 1,
        };
    } else if (rating <= 2) {
        return {
            sentiment: "negative",
            insight: "",
            urgency: 4,
        };
    } else {
        return {
            sentiment: "neutral",
            insight: "",
            urgency: 3,
        };
    }
}
