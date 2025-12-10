import { jsPDF } from "jspdf";

interface EventData {
    name: string;
    date: string | null;
    ended_at?: string | null;
}

interface StatsData {
    totalAttendees: number;
    averageRating: number;
    feedbackCount: number;
}

interface FeedbackItem {
    rating: number | null;
    comment: string | null;
    created_at: string;
    sentiment?: string | null;
}

export const generateEventFeedbackPdf = (
    event: EventData,
    summary: string,
    stats: StatsData,
    feedback: FeedbackItem[]
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Helper for text wrapping
    const splitText = (text: string, fontSize: number, maxWidth: number) => {
        doc.setFontSize(fontSize);
        return doc.splitTextToSize(text, maxWidth);
    };

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(event.name, margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const dateStr = event.date ? new Date(event.date).toLocaleDateString() : "No date";
    const endedStr = event.ended_at ? ` • Ended ${new Date(event.ended_at).toLocaleDateString()}` : "";
    doc.text(`${dateStr}${endedStr}`, margin, y);
    y += 15;

    // AI Summary
    if (summary) {
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("AI Summary", margin, y);
        y += 8;

        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        const summaryLines = splitText(summary, 11, pageWidth - (margin * 2));
        doc.text(summaryLines, margin, y);
        y += (summaryLines.length * 5) + 15;
    }

    // Key Stats
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Key Stats", margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Responses: ${stats.feedbackCount}`, margin, y);
    doc.text(`Average Rating: ${stats.averageRating.toFixed(1)}/5.0`, margin + 80, y);
    y += 15;

    // Feedback List
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("All Feedback", margin, y);
    y += 10;

    doc.setFontSize(10);
    feedback.forEach((item, index) => {
        // Check for page break
        if (y > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            y = 20;
        }

        // Rating
        doc.setTextColor(100, 100, 100);
        const ratingText = item.rating ? `${item.rating}/5` : "No rating";
        const dateText = new Date(item.created_at).toLocaleDateString();
        doc.text(`${ratingText} • ${dateText}`, margin, y);
        y += 5;

        // Comment
        if (item.comment) {
            doc.setTextColor(40, 40, 40);
            const commentLines = splitText(item.comment, 10, pageWidth - (margin * 2));
            doc.text(commentLines, margin, y);
            y += (commentLines.length * 4) + 8;
        } else {
            y += 8;
        }
    });

    // Save
    const filename = `ripple-feedback-${event.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
    doc.save(filename);
};
