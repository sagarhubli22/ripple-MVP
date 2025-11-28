import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { calculateSentimentMetrics, validatePollSuggestion } from "../../../lib/polls/pollHelpers";
import type { SmartPollSuggestion } from "../../../lib/polls/types";

export async function POST(req: NextRequest) {
    try {
        const { eventId, eventName } = await req.json();

        if (!eventId) {
            return NextResponse.json(
                { error: "eventId is required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 }
            );
        }

        let name = eventName;

        // Only fetch event if name not provided
        if (!name) {
            const { data: event, error: eventError } = await supabase
                .from("events")
                .select("name")
                .eq("id", eventId)
                .single();

            if (eventError || !event) {
                // If we can't find the event (likely due to RLS), but we need it for context
                // We'll proceed but with a generic name if fetch fails
                console.warn("Could not fetch event details (likely RLS), using generic context");
                name = "Event";
            } else {
                name = event.name;
            }
        }

        // Fetch recent feedback (last 30 entries)
        const { data: feedback, error: feedbackError } = await supabase
            .from("feedback")
            .select("rating, comment, sentiment, created_at")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false })
            .limit(30);

        if (feedbackError) {
            return NextResponse.json(
                { error: "Failed to fetch feedback" },
                { status: 500 }
            );
        }



        // Calculate sentiment metrics
        const metrics = calculateSentimentMetrics(feedback);

        const xaiApiKey = process.env.XAI_API_KEY;

        if (!xaiApiKey) {
            console.error("xAI API key missing");
            return NextResponse.json(
                { error: "xAI API key not configured" },
                { status: 500 }
            );
        }

        console.log("Generating AI poll suggestion for event:", eventId);

        try {
            const systemPrompt = `You are an event engagement co-pilot. Your job is to suggest quick polls or icebreakers to keep energy up and gather valuable insights during live events.

Based on the feedback sentiment and comments, suggest ONE engaging poll or icebreaker question.

Rules:
- If energy seems low (negative sentiment), suggest energizing questions or quick breaks
- If sentiment is positive, build on the momentum with deeper engagement questions
- Polls should have 2-3 options
- Icebreakers can be open-ended (no options needed)
- Keep questions short and actionable

Respond with ONLY valid JSON in this exact format:
{
  "type": "poll" or "icebreaker",
  "question": "your question here",
  "option_1": "first option" or null,
  "option_2": "second option" or null,
  "option_3": "third option" or null
}`;

            const userPrompt = `Event: "${name}"

Sentiment Metrics:
- Total feedback: ${metrics.totalFeedback}
- Average rating: ${metrics.averageRating.toFixed(1)}/5
- Positive: ${metrics.positiveCount}, Neutral: ${metrics.neutralCount}, Negative: ${metrics.negativeCount}

Recent comments:
${metrics.recentComments.slice(0, 5).map((c, i) => `${i + 1}. "${c}"`).join('\n') || 'No comments yet'}

Generate ONE smart poll or icebreaker suggestion.`;

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
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt },
                        ],
                        temperature: 0.7,
                    }),
                }
            );

            if (!xaiResponse.ok) {
                const errorText = await xaiResponse.text();
                console.error("xAI API error:", xaiResponse.status, errorText);
                return NextResponse.json(
                    { error: `xAI API failed: ${xaiResponse.status} ${xaiResponse.statusText}` },
                    { status: xaiResponse.status }
                );
            }

            const data = await xaiResponse.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                return NextResponse.json(
                    { error: "No content received from xAI" },
                    { status: 500 }
                );
            }

            // Parse JSON response (handle markdown code blocks)
            let jsonStr = content.trim();
            const jsonMatch = jsonStr.match(/```json\n?(.*?)\n?```/s) || jsonStr.match(/```\n?(.*?)\n?```/s);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            const parsed = JSON.parse(jsonStr);
            const validated = validatePollSuggestion(parsed);

            if (!validated) {
                return NextResponse.json(
                    { error: "Failed to validate AI suggestion format" },
                    { status: 500 }
                );
            }

            return NextResponse.json(validated);

        } catch (xaiError) {
            console.error("xAI suggestion failed:", xaiError);
            return NextResponse.json(
                {
                    error: "Failed to generate AI suggestion",
                    details: xaiError instanceof Error ? xaiError.message : "Unknown error"
                },
                { status: 500 }
            );
        }
    } catch (err) {
        console.error("Error in suggestSmartPoll:", err);
        return NextResponse.json(
            {
                error: err instanceof Error ? err.message : "Internal server error",
                details: err instanceof Error ? err.stack : undefined,
            },
            { status: 500 }
        );
    }
}

function getFallbackSuggestion(metrics: any): SmartPollSuggestion {
    const { averageRating, negativeCount, positiveCount } = metrics;

    // Low energy - suggest a break or energy boost
    if (averageRating < 3 || negativeCount > positiveCount) {
        return {
            type: "poll",
            question: "How are you feeling about the session so far?",
            option_1: "Great, keep going!",
            option_2: "Could use a quick break",
            option_3: "Would like more interaction",
        };
    }

    // High energy - build on momentum
    if (averageRating >= 4) {
        return {
            type: "icebreaker",
            question: "What's been the most valuable takeaway for you so far?",
            option_1: null,
            option_2: null,
            option_3: null,
        };
    }

    // Neutral - general engagement
    return {
        type: "poll",
        question: "What would make this session even better?",
        option_1: "More Q&A time",
        option_2: "More practical examples",
        option_3: "Shorter sessions",
    };
}
