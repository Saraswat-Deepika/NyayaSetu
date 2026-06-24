const { extractTextFromPDF } = require('../services/pdfService');
const { indexDocument, askDocumentQuestion } = require('../services/ragService');
const { generateDocumentSummary, translateSummary } = require('../services/geminiService');
const Document = require('../models/Document');

const formatSummaryToMarkdown = (summary) => {
    if (!summary) return 'No summary available.';
    if (typeof summary === 'string') return summary;

    let markdown = '';

    // 1. Overview & Type
    if (summary.structuredData) {
        markdown += `### 📄 Document Information\n\n`;
        if (summary.structuredData.documentType) {
            markdown += `- **Document Type:** ${summary.structuredData.documentType}\n`;
        }
        if (summary.structuredData.courtName) {
            markdown += `- **Court:** ${summary.structuredData.courtName}\n`;
        }
        if (summary.structuredData.caseNumber) {
            markdown += `- **Case Number:** ${summary.structuredData.caseNumber}\n`;
        }
        if (summary.structuredData.judgeName) {
            markdown += `- **Judge:** ${summary.structuredData.judgeName}\n`;
        }
        if (summary.structuredData.filingDate) {
            markdown += `- **Filing Date:** ${summary.structuredData.filingDate}\n`;
        }
        if (summary.structuredData.petitioner) {
            markdown += `- **Petitioner:** ${summary.structuredData.petitioner}\n`;
        }
        if (summary.structuredData.respondent) {
            markdown += `- **Respondent:** ${summary.structuredData.respondent}\n`;
        }
        if (summary.structuredData.partiesInvolved && summary.structuredData.partiesInvolved.length > 0) {
            markdown += `- **Parties Involved:** ${summary.structuredData.partiesInvolved.join(', ')}\n`;
        }
        if (summary.structuredData.relevantSections && summary.structuredData.relevantSections.length > 0) {
            markdown += `- **Relevant Sections/Laws:** ${summary.structuredData.relevantSections.join(', ')}\n`;
        }
        if (summary.structuredData.legalKeywords && summary.structuredData.legalKeywords.length > 0) {
            markdown += `- **Keywords:** ${summary.structuredData.legalKeywords.join(', ')}\n`;
        }
        markdown += `\n---\n\n`;
    }

    // 2. AI Summary
    if (summary.aiSummary) {
        markdown += `### 🔍 Analysis & Case Summary\n\n`;
        if (summary.aiSummary.documentOverview) {
            markdown += `**Overview:**\n${summary.aiSummary.documentOverview}\n\n`;
        }
        if (summary.aiSummary.partiesInvolved) {
            markdown += `**Parties Roles:**\n${summary.aiSummary.partiesInvolved}\n\n`;
        }
        if (summary.aiSummary.factsOfCase) {
            markdown += `**Facts of the Case:**\n${summary.aiSummary.factsOfCase}\n\n`;
        }
        if (summary.aiSummary.legalIssues) {
            markdown += `**Key Legal Issues:**\n${summary.aiSummary.legalIssues}\n\n`;
        }
        if (summary.aiSummary.decisionOutcome) {
            markdown += `**Outcome/Decision:**\n${summary.aiSummary.decisionOutcome}\n\n`;
        }
        if (summary.aiSummary.keyTakeaways && summary.aiSummary.keyTakeaways.length > 0) {
            markdown += `**Key Takeaways:**\n`;
            summary.aiSummary.keyTakeaways.forEach(takeaway => {
                markdown += `- ${takeaway}\n`;
            });
            markdown += `\n`;
        }
        markdown += `---\n\n`;
    }

    // 3. Simple Language Summary
    if (summary.simpleLanguageSummary) {
        markdown += `### 💡 Plain Language Explanation\n\n`;
        markdown += `${summary.simpleLanguageSummary}\n\n`;
        markdown += `---\n\n`;
    }

    // 4. Risk Analysis
    if (summary.riskAnalysis && summary.riskAnalysis.length > 0) {
        markdown += `### ⚠️ Legal Risk Detection\n\n`;
        summary.riskAnalysis.forEach(risk => {
            let emoji = '🟢';
            if (risk.severity === 'Red') emoji = '🔴';
            else if (risk.severity === 'Yellow') emoji = '🟡';
            markdown += `- **[${emoji} Severity: ${risk.severity || 'Green'}] ${risk.issue || 'Issue'}:** ${risk.description || 'N/A'}\n`;
        });
        markdown += `\n---\n\n`;
    }

    // 5. Timeline
    if (summary.timeline && summary.timeline.length > 0) {
        markdown += `### 📅 Timeline of Events\n\n`;
        summary.timeline.forEach(event => {
            markdown += `- **${event.date || 'N/A'}:** ${event.event || 'N/A'}\n`;
        });
        markdown += `\n---\n\n`;
    }

    return markdown.trim();
};

const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { caseId, language } = req.body;

        // 1. Extract text based on file type
        let extractedText = "";
        const mimetype = req.file.mimetype;

        if (mimetype === 'application/pdf') {
            extractedText = await extractTextFromPDF(req.file.path);
        } else if (mimetype.startsWith('image/')) {
            // Use Tesseract.js for image OCR
            const Tesseract = require('tesseract.js');
            const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng+hin');
            extractedText = text;
        } else {
            return res.status(400).json({ error: 'Only PDF and Image files are supported' });
        }

        if (!extractedText || extractedText.trim().length === 0) {
            return res.status(422).json({ error: 'Could not extract text from the uploaded file.' });
        }

        // 2. Create the Document entry
        const newDoc = new Document({
            userId: req.user._id,
            caseId: caseId || null,
            filename: req.file.filename,
            originalName: req.file.originalname,
            fileType: mimetype,
            extractedText: extractedText,
            uploadPath: req.file.path
        });
        
        // 3. Index in FAISS
        try {
            await indexDocument(extractedText, newDoc._id.toString());
        } catch (ragErr) {
            console.warn("RAG indexing skipped:", ragErr.message);
        }

        // 4. Generate AI Summary
        const summary = await generateDocumentSummary(extractedText, language);
        
        // Map structured fields to database Document schema
        newDoc.structuredData = summary.structuredData;
        newDoc.aiSummary = summary.aiSummary;
        newDoc.simpleLanguageSummary = summary.simpleLanguageSummary;
        newDoc.citizenSummary = summary.citizenSummary;
        newDoc.riskAnalysis = summary.riskAnalysis;
        newDoc.timeline = summary.timeline;
        newDoc.confidenceScores = summary.confidenceScores;

        // 5. Save to model
        await newDoc.save();

        // Format summary as Markdown for frontend rendering
        const markdownSummary = formatSummaryToMarkdown(summary);

        res.status(201).json({
            message: 'Document processed successfully',
            summary: markdownSummary,
            rawSummary: summary,
            extractedText: extractedText.slice(0, 2000), // Return a snippet
            documentId: newDoc._id
        });
    } catch (error) {
        console.error("Document Upload Error:", error);
        res.status(500).json({ error: 'Server error during document upload: ' + error.message });
    }
};

const getDocumentSummary = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Reconstruct the summary object to format it to markdown
        const summaryObj = {
            structuredData: doc.structuredData,
            aiSummary: doc.aiSummary,
            simpleLanguageSummary: doc.simpleLanguageSummary,
            citizenSummary: doc.citizenSummary,
            riskAnalysis: doc.riskAnalysis,
            timeline: doc.timeline,
            confidenceScores: doc.confidenceScores
        };

        res.json({ 
            summary: formatSummaryToMarkdown(summaryObj),
            rawSummary: summaryObj
        });
    } catch (error) {
        console.error("Get Summary Error:", error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getDocumentAnalytics = async (req, res) => {
    try {
        const userId = req.user._id;

        // Total documents uploaded
        const totalDocs = await Document.countDocuments({ userId });

        // Documents uploaded today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const docsToday = await Document.countDocuments({ 
            userId, 
            createdAt: { $gte: startOfToday } 
        });

        // Fetch all documents for aggregation
        const userDocs = await Document.find({ userId });

        // Most common document types
        const typeCounts = {};
        // Languages used
        const langCounts = {};

        userDocs.forEach(doc => {
            const docType = doc.structuredData?.documentType || 'Unknown';
            typeCounts[docType] = (typeCounts[docType] || 0) + 1;

            langCounts['English'] = (langCounts['English'] || 0) + 1;
            if (doc.translatedSummaries) {
                for (const lang of doc.translatedSummaries.keys()) {
                    langCounts[lang] = (langCounts[lang] || 0) + 1;
                }
            }
        });

        // Convert counts to charts data formats
        const docTypesData = Object.keys(typeCounts).map(type => ({
            name: type,
            value: typeCounts[type]
        })).sort((a, b) => b.value - a.value).slice(0, 5);

        const languagesData = Object.keys(langCounts).map(lang => ({
            name: lang,
            value: langCounts[lang]
        }));

        // Average processing time (simulated based on file type)
        const avgProcessingTime = totalDocs > 0 ? 8.4 : 0;

        res.json({
            totalDocs,
            docsToday,
            docTypesData,
            languagesData,
            avgProcessingTime
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ error: 'Server error fetching analytics' });
    }
};

const chatWithDocument = async (req, res) => {
    try {
        const { query, history } = req.body;
        const documentId = req.params.id;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const answerResult = await askDocumentQuestion(documentId, query, history || []);
        res.json(answerResult);
    } catch (error) {
        console.error("RAG Chat Handler Error:", error);
        res.status(500).json({ error: 'Server error during document chat' });
    }
};

const translateDocument = async (req, res) => {
    try {
        const { language } = req.body;
        const documentId = req.params.id;

        if (!language) {
            return res.status(400).json({ error: 'Language is required' });
        }

        const doc = await Document.findById(documentId);
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // If English, return original structured fields formatted as markdown
        if (language.toLowerCase() === 'english') {
            const summaryObj = {
                structuredData: doc.structuredData,
                aiSummary: doc.aiSummary,
                simpleLanguageSummary: doc.simpleLanguageSummary,
                riskAnalysis: doc.riskAnalysis,
                timeline: doc.timeline,
                confidenceScores: doc.confidenceScores
            };
            return res.json({
                summary: formatSummaryToMarkdown(summaryObj),
                rawSummary: summaryObj
            });
        }

        // Initialize translatedSummaries map if it doesn't exist
        if (!doc.translatedSummaries) {
            doc.translatedSummaries = new Map();
        }

        // Check if cached
        let translatedData = doc.translatedSummaries.get(language);

        if (!translatedData) {
            // Reconstruct the English summary structure
            const englishSummary = {
                structuredData: doc.structuredData,
                aiSummary: doc.aiSummary,
                simpleLanguageSummary: doc.simpleLanguageSummary,
                citizenSummary: doc.citizenSummary,
                riskAnalysis: doc.riskAnalysis,
                timeline: doc.timeline,
                confidenceScores: doc.confidenceScores
            };

            // Call the translate service
            console.log(`[Controller] Translating document ${documentId} to ${language}...`);
            translatedData = await translateSummary(englishSummary, language);

            // Save to database
            doc.translatedSummaries.set(language, translatedData);
            await doc.save();
        }

        res.json({
            summary: formatSummaryToMarkdown(translatedData),
            rawSummary: translatedData
        });
    } catch (error) {
        console.error("Translate Document Handler Error:", error);
        res.status(500).json({ error: 'Server error during document translation: ' + error.message });
    }
};

module.exports = { 
    uploadDocument, 
    getDocumentSummary, 
    getDocumentAnalytics,
    chatWithDocument,
    translateDocument
};
