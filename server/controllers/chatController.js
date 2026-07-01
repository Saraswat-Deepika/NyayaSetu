const { getLegalGuidance } = require('../services/llm/geminiService');
const Case = require('../models/Case');
const ChatSession = require('../models/ChatSession');
const banditService = require('../services/banditService');
const { transcribeAudio } = require('../services/whisperService');
const bhashiniService = require('../services/bhashiniService');
const BanditStat = require('../models/BanditStat');
const QueryFeedback = require('../models/QueryFeedback');

// --- Legal & Chat Logic ---
const askLegalQuestion = async (req, res) => {
    try {
        const { question, query, history, language, category: reqCategory, title, sessionId } = req.body;
        const userQuery = question || query;
        if (!userQuery) return res.status(400).json({ error: 'Question is required' });

        let category = reqCategory;
        let selectedStrategy = 'GeminiLLM';
        let confidenceScore = 0.8;
        let guidance = '';

        const legalCheck = await banditService.isLegalQuery(userQuery);
        if (!legalCheck) {
            let nonLegalMessage = "I am NyayaSetu, your AI Legal Assistant. I can only assist with legal queries.";
            return res.status(201).json({
                success: true, answer: nonLegalMessage, guidance: nonLegalMessage, response: nonLegalMessage,
                selectedStrategy: 'None', confidenceScore: 1.0, case: null
            });
        }

        try {
            if (!category || category === 'RTI' || category === 'Other') {
                category = await banditService.classifyCategory(userQuery);
            }
            const strategyResult = await banditService.getBestStrategy(category);
            selectedStrategy = strategyResult.selectedArm;
            confidenceScore = strategyResult.confidence;
            await banditService.incrementSelection(category, selectedStrategy);
            guidance = await banditService.generateAnswerByStrategy(selectedStrategy, userQuery, category, history, language);
        } catch (banditErr) {
            selectedStrategy = 'GeminiLLM';
            guidance = await getLegalGuidance(userQuery, history, language);
        }

        let newCase = null;
        if (req.user) {
            newCase = new Case({
                userId: req.user._id, title: title || `${category} Query`, description: userQuery,
                category, aiSummary: guidance, language: language || 'english', selectedStrategy, feedbackStatus: 'none'
            });
            await newCase.save();
        }

        let chatSession = null;
        if (req.user) {
            if (sessionId) chatSession = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
            if (chatSession) {
                chatSession.messages.push({ role: 'user', content: userQuery });
                chatSession.messages.push({ role: 'ai', content: guidance, queryId: newCase?._id, strategy: selectedStrategy, feedback: 'none' });
                chatSession.markModified('messages');
                await chatSession.save();
            } else {
                const titleWords = userQuery.split(/\s+/).slice(0, 6).join(' ');
                chatSession = new ChatSession({
                    userId: req.user._id, title: titleWords,
                    messages: [
                        { role: 'user', content: userQuery },
                        { role: 'ai', content: guidance, queryId: newCase?._id, strategy: selectedStrategy, feedback: 'none' }
                    ]
                });
                await chatSession.save();
            }
        }

        res.status(201).json({
            success: true, answer: guidance, guidance, response: guidance,
            selectedStrategy, confidenceScore, case: newCase,
            sessionId: chatSession ? chatSession._id : null, chatSession
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message || 'Server error' });
    }
};

const getChatSessions = async (req, res) => {
    try {
        const sessions = await ChatSession.find({ userId: req.user._id }).select('_id title updatedAt').sort({ updatedAt: -1 });
        res.json({ success: true, sessions });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

const getChatSessionById = async (req, res) => {
    try {
        const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user._id });
        if (!session) return res.status(404).json({ success: false, error: 'Chat session not found' });
        res.json({ success: true, session });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

const deleteChatSession = async (req, res) => {
    try {
        const session = await ChatSession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!session) return res.status(404).json({ success: false, error: 'Chat session not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// --- Voice Logic ---
const handleVoiceUpload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });
        const language = req.body.language || 'English';
        const transcript = await transcribeAudio(req.file.path, language);
        req.body.question = transcript;
        return await askLegalQuestion(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Server error during voice processing' });
    }
};

// --- Translation Logic ---
const translateText = async (req, res) => {
    try {
        const { text, sourceLang, targetLang } = req.body;
        if (!text || !targetLang) return res.status(400).json({ message: 'Missing fields' });
        const translatedText = await bhashiniService.translateText(text, sourceLang || 'English', targetLang);
        res.json({ message: 'Translation successful', translatedText });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Bandit Stats Logic ---
const getBanditStats = async (req, res) => {
    try {
        const stats = await BanditStat.find();
        res.json({ success: true, rawStats: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const getBanditStatsByCategory = async (req, res) => {
    try {
        const stats = await BanditStat.find({ category: req.params.category });
        res.json({ success: true, category: req.params.category, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const submitFeedback = async (req, res) => {
    try {
        const { queryId, feedback } = req.body;
        if (!queryId || !feedback) return res.status(400).json({ success: false, error: "Missing fields" });
        await banditService.recordFeedback(queryId, feedback);
        res.json({ success: true, message: "Feedback recorded." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    askLegalQuestion, getChatSessions, getChatSessionById, deleteChatSession,
    handleVoiceUpload, translateText, getBanditStats, getBanditStatsByCategory, submitFeedback
};
