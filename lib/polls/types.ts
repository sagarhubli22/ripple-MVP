export type PollType = 'poll' | 'icebreaker';
export type PollStatus = 'draft' | 'live' | 'closed';

export interface Poll {
    id: string;
    event_id: string;
    type: PollType;
    question: string;
    option_1: string | null;
    option_2: string | null;
    option_3: string | null;
    status: PollStatus;
    created_at: string;
}

export interface PollResponse {
    id: string;
    poll_id: string;
    attendee_identifier: string;
    selected_option: string;
    created_at: string;
}

export interface SmartPollSuggestion {
    type: PollType;
    question: string;
    option_1: string | null;
    option_2: string | null;
    option_3: string | null;
}

export interface SentimentMetrics {
    averageRating: number;
    totalFeedback: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    recentComments: string[];
}

export interface PollWithResponses extends Poll {
    responseCount: number;
    responses?: PollResponse[];
}
