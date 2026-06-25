const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: false },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true },
    extractedText: { type: String },
    
    // AI Structured Data
    structuredData: {
        documentType: String,
        partiesInvolved: [String],
        courtName: String,
        caseNumber: String,
        judgeName: String,
        filingDate: String,
        relevantSections: [String],
        petitioner: String,
        respondent: String,
        legalKeywords: [String]
    },
    
    // Section-Wise AI Summary
    aiSummary: {
        documentOverview: String,
        partiesInvolved: String,
        factsOfCase: String,
        legalIssues: String,
        decisionOutcome: String,
        keyTakeaways: [String]
    },
    
    // Simple Language Explanations
    simpleLanguageSummary: { type: String },
    
    // Citizen Simplified Summary
    citizenSummary: {
        whatThisDocumentIsAbout: String,
        whoIsInvolved: String,
        keyFactsAndDecisions: [String],
        whatThisMeansForYou: String,
        whatYouShouldDoNext: [String],
        importantDatesAndDeadlines: [String],
        legalTermsExplained: [{
            term: String,
            definition: String
        }],
        risksToBeAwareOf: [String]
    },
    
    // Legal Risk Detection
    riskAnalysis: [{
        issue: String,
        severity: { type: String, enum: ['Green', 'Yellow', 'Red'] },
        description: String
    }],
    
    // Timeline Generator
    timeline: [{
        date: String,
        event: String
    }],
    
    // Confidence Metrics
    confidenceScores: {
        ocrAccuracy: Number,
        summaryConfidence: Number,
        entityExtractionConfidence: Number
    },
    
    // Multi-Language Support
    translatedSummaries: {
        type: Map,
        of: mongoose.Schema.Types.Mixed // Will store the same structure as aiSummary + simpleLanguageSummary for a specific language
    },
    
    uploadPath: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
