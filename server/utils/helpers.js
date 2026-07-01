const sendResponse = (res, statusCode, data, message) => {
    return res.status(statusCode).json({
        success: statusCode >= 200 && statusCode < 300,
        message,
        data
    });
};

const formatSummaryToMarkdown = (summary) => {
    if (!summary) return 'No summary available.';
    if (typeof summary === 'string') return summary;

    let markdown = '';
    if (summary.structuredData) {
        markdown += `### 📄 Document Information\n\n`;
        if (summary.structuredData.documentType) markdown += `- **Document Type:** ${summary.structuredData.documentType}\n`;
        if (summary.structuredData.courtName) markdown += `- **Court:** ${summary.structuredData.courtName}\n`;
        if (summary.structuredData.caseNumber) markdown += `- **Case Number:** ${summary.structuredData.caseNumber}\n`;
        if (summary.structuredData.judgeName) markdown += `- **Judge:** ${summary.structuredData.judgeName}\n`;
        if (summary.structuredData.filingDate) markdown += `- **Filing Date:** ${summary.structuredData.filingDate}\n`;
        if (summary.structuredData.petitioner) markdown += `- **Petitioner:** ${summary.structuredData.petitioner}\n`;
        if (summary.structuredData.respondent) markdown += `- **Respondent:** ${summary.structuredData.respondent}\n`;
        if (summary.structuredData.partiesInvolved && summary.structuredData.partiesInvolved.length > 0) markdown += `- **Parties Involved:** ${summary.structuredData.partiesInvolved.join(', ')}\n`;
        if (summary.structuredData.relevantSections && summary.structuredData.relevantSections.length > 0) markdown += `- **Relevant Sections/Laws:** ${summary.structuredData.relevantSections.join(', ')}\n`;
        if (summary.structuredData.legalKeywords && summary.structuredData.legalKeywords.length > 0) markdown += `- **Keywords:** ${summary.structuredData.legalKeywords.join(', ')}\n`;
        markdown += `\n---\n\n`;
    }
    if (summary.aiSummary) {
        markdown += `### 🔍 Analysis & Case Summary\n\n`;
        if (summary.aiSummary.documentOverview) markdown += `**Overview:**\n${summary.aiSummary.documentOverview}\n\n`;
        if (summary.aiSummary.partiesInvolved) markdown += `**Parties Roles:**\n${summary.aiSummary.partiesInvolved}\n\n`;
        if (summary.aiSummary.factsOfCase) markdown += `**Facts of the Case:**\n${summary.aiSummary.factsOfCase}\n\n`;
        if (summary.aiSummary.legalIssues) markdown += `**Key Legal Issues:**\n${summary.aiSummary.legalIssues}\n\n`;
        if (summary.aiSummary.decisionOutcome) markdown += `**Outcome/Decision:**\n${summary.aiSummary.decisionOutcome}\n\n`;
        if (summary.aiSummary.keyTakeaways && summary.aiSummary.keyTakeaways.length > 0) {
            markdown += `**Key Takeaways:**\n`;
            summary.aiSummary.keyTakeaways.forEach(takeaway => markdown += `- ${takeaway}\n`);
            markdown += `\n`;
        }
        markdown += `---\n\n`;
    }
    if (summary.simpleLanguageSummary) {
        markdown += `### 💡 Plain Language Explanation\n\n${summary.simpleLanguageSummary}\n\n---\n\n`;
    }
    if (summary.riskAnalysis && summary.riskAnalysis.length > 0) {
        markdown += `### ⚠️ Legal Risk Detection\n\n`;
        summary.riskAnalysis.forEach(risk => {
            let emoji = risk.severity === 'Red' ? '🔴' : (risk.severity === 'Yellow' ? '🟡' : '🟢');
            markdown += `- **[${emoji} Severity: ${risk.severity || 'Green'}] ${risk.issue || 'Issue'}:** ${risk.description || 'N/A'}\n`;
        });
        markdown += `\n---\n\n`;
    }
    if (summary.timeline && summary.timeline.length > 0) {
        markdown += `### 📅 Timeline of Events\n\n`;
        summary.timeline.forEach(event => markdown += `- **${event.date || 'N/A'}:** ${event.event || 'N/A'}\n`);
        markdown += `\n---\n\n`;
    }
    return markdown.trim();
};

module.exports = { sendResponse, formatSummaryToMarkdown };
