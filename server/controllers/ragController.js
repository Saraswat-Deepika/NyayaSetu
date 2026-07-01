const Document = require('../models/Document');
const { searchRelevantDocs } = require('../services/rag/retrievalService');
const { createRAGPrompt } = require('../services/rag/promptService');
const { generateAnswer } = require('../services/rag/answerService');
const { translateSummary } = require('../services/llm/geminiService');
const { formatSummaryToMarkdown } = require('../utils/helpers');

const getDocumentSummary = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        
        const summaryObj = {
            structuredData: doc.structuredData,
            aiSummary: doc.aiSummary,
            simpleLanguageSummary: doc.simpleLanguageSummary,
            citizenSummary: doc.citizenSummary,
            riskAnalysis: doc.riskAnalysis,
            timeline: doc.timeline,
            confidenceScores: doc.confidenceScores
        };

        res.json({ summary: formatSummaryToMarkdown(summaryObj), rawSummary: summaryObj });
    } catch (error) {
        console.error("Get Summary Error:", error);
        res.status(500).json({ error: 'Server error' });
    }
};

const chatWithDocument = async (req, res) => {
    try {
        const { query, history } = req.body;
        const documentId = req.params.id;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const searchResults = await searchRelevantDocs(query, documentId);
        if (!searchResults || searchResults.length === 0) {
            return res.json({ answer: "I could not find any relevant information in the uploaded document." });
        }
        
        const contextText = searchResults.map(doc => doc.pageContent).join("\n\n");
        const historyPrompt = history && history.length > 0 
            ? history.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join("\n") 
            : "No previous conversation.";
        
        const prompt = createRAGPrompt(contextText, historyPrompt, query);
        const answer = await generateAnswer(prompt);

        const citations = searchResults.map(doc => ({
            text: doc.pageContent.substring(0, 150) + "...",
            documentId: doc.metadata.documentId
        }));

        res.json({ answer, citations });
    } catch (error) {
        console.error("RAG Chat Handler Error:", error);
        res.status(500).json({ error: 'Server error during document chat' });
    }
};

const translateDocument = async (req, res) => {
    try {
        const { language } = req.body;
        const documentId = req.params.id;
        if (!language) return res.status(400).json({ error: 'Language is required' });

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        if (language.toLowerCase() === 'english') {
            const summaryObj = {
                structuredData: doc.structuredData, aiSummary: doc.aiSummary,
                simpleLanguageSummary: doc.simpleLanguageSummary, riskAnalysis: doc.riskAnalysis,
                timeline: doc.timeline, confidenceScores: doc.confidenceScores
            };
            return res.json({ summary: formatSummaryToMarkdown(summaryObj), rawSummary: summaryObj });
        }

        if (!doc.translatedSummaries) doc.translatedSummaries = new Map();
        let translatedData = doc.translatedSummaries.get(language);

        if (!translatedData) {
            const englishSummary = {
                structuredData: doc.structuredData, aiSummary: doc.aiSummary,
                simpleLanguageSummary: doc.simpleLanguageSummary, citizenSummary: doc.citizenSummary,
                riskAnalysis: doc.riskAnalysis, timeline: doc.timeline, confidenceScores: doc.confidenceScores
            };
            translatedData = await translateSummary(englishSummary, language);
            doc.translatedSummaries.set(language, translatedData);
            await doc.save();
        }

        res.json({ summary: formatSummaryToMarkdown(translatedData), rawSummary: translatedData });
    } catch (error) {
        console.error("Translate Document Handler Error:", error);
        res.status(500).json({ error: 'Server error during document translation: ' + error.message });
    }
};

module.exports = { getDocumentSummary, chatWithDocument, translateDocument };
