export type SentimentResult = {
    sentiment: "positive" | "neutral" | "negative";
    highlightInsight: string | null;
    highlightUrgency: number | null;
};

/**
 * Classifies sentiment based solely on the star rating.
 * This function does NOT call any external APIs (OpenAI, xAI, etc.).
 * It uses simple rating-based rules to ensure sentiment is always populated.
 */
export function classifySentimentFromRating(
    rating: number | null | undefined
): SentimentResult {
    if (rating == null) {
        return {
            sentiment: "neutral",
            highlightInsight: null,
            highlightUrgency: 3,
        };
    }

    if (rating >= 4) {
        return {
            sentiment: "positive",
            highlightInsight: null,
            highlightUrgency: 1,
        };
    }

    if (rating <= 2) {
        return {
            sentiment: "negative",
            highlightInsight: null,
            highlightUrgency: 5,
        };
    }

    return {
        sentiment: "neutral",
        highlightInsight: null,
        highlightUrgency: 3,
    };
}
