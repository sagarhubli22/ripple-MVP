import type { SentimentMetrics, SmartPollSuggestion } from './types';

/**
 * Generate a unique anonymous identifier for attendees
 * Uses browser fingerprinting combined with timestamp
 */
export function generateAttendeeIdentifier(): string {
    if (typeof window === 'undefined') {
        return `server-${Date.now()}-${Math.random()}`;
    }

    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        new Date().getTimezoneOffset(),
        screen.width,
        screen.height,
    ].join('|');

    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return `attendee-${Math.abs(hash)}-${Date.now()}`;
}

/**
 * Validate the structure of an xAI poll suggestion response
 */
export function validatePollSuggestion(data: any): SmartPollSuggestion | null {
    if (!data || typeof data !== 'object') {
        return null;
    }

    if (!data.type || !['poll', 'icebreaker'].includes(data.type)) {
        return null;
    }

    if (!data.question || typeof data.question !== 'string') {
        return null;
    }

    return {
        type: data.type,
        question: data.question,
        option_1: data.option_1 || null,
        option_2: data.option_2 || null,
        option_3: data.option_3 || null,
    };
}

/**
 * Calculate sentiment metrics from feedback data
 */
export function calculateSentimentMetrics(feedback: any[]): SentimentMetrics {
    let totalRating = 0;
    let ratingCount = 0;
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    const recentComments: string[] = [];

    feedback.forEach((item) => {
        // Calculate ratings
        if (item.rating !== null && item.rating !== undefined) {
            totalRating += item.rating;
            ratingCount++;
        }

        // Count sentiment
        if (item.sentiment === 'positive') {
            positiveCount++;
        } else if (item.sentiment === 'negative') {
            negativeCount++;
        } else {
            neutralCount++;
        }

        // Collect recent comments (limit to 5)
        if (item.comment && recentComments.length < 5) {
            recentComments.push(item.comment);
        }
    });

    return {
        averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
        totalFeedback: feedback.length,
        positiveCount,
        neutralCount,
        negativeCount,
        recentComments,
    };
}

/**
 * Format poll data for display in the UI
 */
export function formatPollForDisplay(poll: any) {
    const options = [poll.option_1, poll.option_2, poll.option_3].filter(
        (opt) => opt !== null && opt !== undefined && opt.trim() !== ''
    );

    return {
        ...poll,
        options,
        hasOptions: options.length > 0,
    };
}

/**
 * Get or create attendee identifier from localStorage
 */
export function getOrCreateAttendeeId(): string {
    if (typeof window === 'undefined') {
        return generateAttendeeIdentifier();
    }

    const storageKey = 'ripple_attendee_id';
    let attendeeId = localStorage.getItem(storageKey);

    if (!attendeeId) {
        attendeeId = generateAttendeeIdentifier();
        localStorage.setItem(storageKey, attendeeId);
    }

    return attendeeId;
}

/**
 * Check if user has already responded to a poll
 */
export function hasRespondedToPoll(pollId: string): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const storageKey = `ripple_poll_response_${pollId}`;
    return localStorage.getItem(storageKey) !== null;
}

/**
 * Mark a poll as responded in localStorage
 */
export function markPollAsResponded(pollId: string, selectedOption: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    const storageKey = `ripple_poll_response_${pollId}`;
    localStorage.setItem(storageKey, JSON.stringify({
        pollId,
        selectedOption,
        respondedAt: new Date().toISOString(),
    }));
}
