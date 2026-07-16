const { getLegalGuidance } = require('../services/groqService');
const Case = require('../models/Case');
const ChatSession = require('../models/ChatSession');
const banditService = require('../services/banditService');
const { searchNearby, searchManual } = require('../services/locationService');
const { matchLaws } = require('../services/lawService');
const { checkEmergency } = require('../services/emergencyService');

const askLegalQuestion = async (req, res) => {
    try {
        // Accept both 'question' (from frontend) and 'query' (legacy/develop)
        // Also accept optional sessionId
        const { question, query, history, language, category: reqCategory, title, sessionId } = req.body;
        const userQuery = question || query;
        
        if (!userQuery) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // Run emergency detection and relevant laws matching
        const emergencyResult = checkEmergency(userQuery);
        let matchedLaws = [];

        let category = reqCategory;
        let selectedStrategy = 'GeminiLLM';
        let confidenceScore = 0.8;
        let guidance = '';

        // 1. Run legal query check and classification concurrently to save latency
        const [legalCheck, classifiedCategory] = await Promise.all([
            banditService.isLegalQuery(userQuery),
            (!category || category === 'RTI' || category === 'Other')
                ? banditService.classifyCategory(userQuery)
                : Promise.resolve(category)
        ]);

        if (!legalCheck) {
            let nonLegalMessage = "";
            try {
                const redirectSystemPrompt = `You are NyayaSetu, an AI Legal Assistant for India.
The user asked a non-legal, conversational, or off-topic question: "${userQuery}".
Provide a friendly response (1-3 sentences) in the language of the query. 
Politely greet them if it is a greeting. If it is a technical, personal, or off-topic question, briefly address it or suggest how they can resolve it, and then politely remind them that you can help with legal queries (such as consumer complaints for defective products/warranties, police reports, tenant rights, etc.) and ask how you can assist them legally.`;
                
                const groqService = require('../services/groqService');
                nonLegalMessage = await groqService.generateChatCompletion(redirectSystemPrompt);
            } catch (err) {
                console.error("Failed to generate custom non-legal redirect:", err);
                nonLegalMessage = `I am NyayaSetu, your AI Legal Assistant for Indian law. I can only assist with legal queries, citizen rights, or drafting legal documents. 

If this is a product defect or warranty issue, you might have rights under the Consumer Protection Act. Please let me know how I can assist you legally.`;
            }
            
            // Save messages in ChatSession even for non-legal queries if user is logged in
            let chatSession = null;
            if (req.user) {
                if (sessionId) {
                    chatSession = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
                }

                if (chatSession) {
                    chatSession.messages.push({ role: 'user', content: userQuery });
                    chatSession.messages.push({
                        role: 'ai',
                        content: nonLegalMessage,
                        queryId: null,
                        strategy: 'None',
                        feedback: 'none',
                        laws: [],
                        emergency: emergencyResult
                    });
                    chatSession.markModified('messages');
                    await chatSession.save();
                } else {
                    const titleWords = userQuery.split(/\s+/).slice(0, 6).join(' ');
                    const chatTitle = titleWords.length < userQuery.length ? `${titleWords}...` : titleWords;

                    chatSession = new ChatSession({
                        userId: req.user._id,
                        title: chatTitle,
                        messages: [
                            { role: 'user', content: userQuery },
                            {
                                role: 'ai',
                                content: nonLegalMessage,
                                queryId: null,
                                strategy: 'None',
                                feedback: 'none',
                                laws: [],
                                emergency: emergencyResult
                            }
                        ]
                    });
                    await chatSession.save();
                }
            }

            return res.status(201).json({
                success: true,
                answer: nonLegalMessage,
                guidance: {
                    reply: nonLegalMessage,
                    severity: "General Guidance",
                    category: "Other",
                    suggestedActions: []
                },
                response: {
                    reply: nonLegalMessage,
                    severity: "General Guidance",
                    category: "Other",
                    suggestedActions: []
                },
                selectedStrategy: 'None',
                confidenceScore: 1.0,
                case: null,
                sessionId: chatSession ? chatSession._id : null,
                chatSession: chatSession,
                laws: [],
                emergency: emergencyResult
            });
        }

        category = classifiedCategory;

        let dbHistory = history || [];
        let chatSession = null;

        if (req.user && sessionId) {
            chatSession = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
            if (chatSession && chatSession.messages) {
                dbHistory = chatSession.messages.map(m => ({ role: m.role, content: m.content }));
            }
        }

        try {
            // 2. Strict RAG Architecture: Bypass bandit and standalone LLMs.
            selectedStrategy = 'StrictRAG';
            confidenceScore = 1.0;
            
            const ragService = require('../services/ragService');
            // Fetch relevant docs using multi-query expansion
            const docs = await ragService.searchRelevantDocs(userQuery, null, true);
            
            // Generate strict guidance using only RAG context
            const { getStrictRagGuidance } = require('../services/groqService');
            
            // Run RAG generation and laws matching in parallel to save latency
            const [generatedGuidance, matchedLawsResult] = await Promise.all([
                getStrictRagGuidance(userQuery, docs, language || 'English', dbHistory),
                matchLaws(userQuery, language || 'English')
            ]);
            
            guidance = generatedGuidance; // This is now a JSON object { reply, severity, category, suggestedActions }
            matchedLaws = matchedLawsResult;
        } catch (err) {
            console.error("⚠️ Strict RAG Generation failed:", err.message);
            guidance = {
                reply: "An error occurred while retrieving legal information. Please try again.",
                severity: "General Guidance",
                category: "Other",
                suggestedActions: []
            };
            matchedLaws = [];
        }

        // Save response to Case model if user is logged in
        let newCase = null;
        if (req.user) {
            newCase = new Case({
                userId: req.user._id,
                title: title || `${guidance.category || category} Query`,
                description: userQuery,
                category: guidance.category || category,
                aiSummary: typeof guidance === 'string' ? guidance : guidance.reply,
                language: language || 'english',
                selectedStrategy: selectedStrategy,
                feedbackStatus: 'none'
            });
            await newCase.save();
        }

        // Save messages in ChatSession if user is logged in
        if (req.user) {
            const aiMessage = {
                role: 'ai',
                content: typeof guidance === 'string' ? guidance : guidance.reply,
                queryId: newCase?._id,
                strategy: selectedStrategy,
                feedback: 'none',
                laws: matchedLaws,
                emergency: emergencyResult,
                severity: guidance.severity || "General Guidance",
                suggestedActions: guidance.suggestedActions || []
            };

            if (chatSession) {
                // Append to existing chat session
                chatSession.messages.push({ role: 'user', content: userQuery });
                chatSession.messages.push(aiMessage);
                // Force mongoose to recognize the update to messages array
                chatSession.markModified('messages');
                await chatSession.save();
            } else {
                // Auto-generate title from the first 6 words of the query
                const titleWords = userQuery.split(/\s+/).slice(0, 6).join(' ');
                const chatTitle = titleWords.length < userQuery.length ? `${titleWords}...` : titleWords;

                // Create new chat session
                chatSession = new ChatSession({
                    userId: req.user._id,
                    title: chatTitle,
                    messages: [
                        { role: 'user', content: userQuery },
                        aiMessage
                    ]
                });
                await chatSession.save();
            }
        }

        res.status(201).json({
            success: true,
            answer: guidance,
            guidance: guidance,
            response: guidance, // Compat with develop/legacy
            selectedStrategy: selectedStrategy,
            confidenceScore: confidenceScore === Infinity ? 0.95 : confidenceScore,
            case: newCase,
            sessionId: chatSession ? chatSession._id : null,
            chatSession: chatSession,
            laws: matchedLaws,
            emergency: emergencyResult
        });
    } catch (error) {
        console.error("Error in askLegalQuestion:", error);
        return res.status(500).json({ success: false, error: error.message || 'Server error' });
    }
};

const getChatSessions = async (req, res) => {
    try {
        const sessions = await ChatSession.find({ userId: req.user._id })
            .select('_id title updatedAt')
            .sort({ updatedAt: -1 });
        
        res.json({
            success: true,
            sessions
        });
    } catch (error) {
        console.error("Error fetching chat sessions:", error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

const getChatSessionById = async (req, res) => {
    try {
        const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user._id });
        if (!session) {
            return res.status(404).json({ success: false, error: 'Chat session not found' });
        }
        res.json({
            success: true,
            session
        });
    } catch (error) {
        console.error("Error fetching chat session details:", error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

const deleteChatSession = async (req, res) => {
    try {
        const session = await ChatSession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!session) {
            return res.status(404).json({ success: false, error: 'Chat session not found' });
        }
        res.json({
            success: true,
            message: 'Chat session deleted successfully'
        });
    } catch (error) {
        console.error("Error deleting chat session:", error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

const findNearbyHelpController = async (req, res) => {
    try {
        const { latitude, longitude, city, state } = req.body;
        let results = [];
        if (latitude !== undefined && longitude !== undefined) {
            results = await searchNearby(parseFloat(latitude), parseFloat(longitude));
        } else if (city || state) {
            results = await searchManual(city, state);
        } else {
            return res.status(400).json({ success: false, error: 'Location coordinates or city/state manual query required' });
        }
        res.json({ success: true, facilities: results });
    } catch (error) {
        console.error("Error in findNearbyHelpController:", error);
        res.status(500).json({ success: false, error: 'Server error looking up nearby help' });
    }
};

const getRelevantLawsController = async (req, res) => {
    try {
        const { query, language } = req.body;
        if (!query) {
            return res.status(400).json({ success: false, error: 'Query is required' });
        }
        const laws = await matchLaws(query, language || 'English');
        res.json({ success: true, laws });
    } catch (error) {
        console.error("Error in getRelevantLawsController:", error);
        res.status(500).json({ success: false, error: 'Server error retrieving laws' });
    }
};

const detectEmergencyController = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ success: false, error: 'Query is required' });
        }
        const result = checkEmergency(query);
        res.json({ success: true, emergency: result });
    } catch (error) {
        console.error("Error in detectEmergencyController:", error);
        res.status(500).json({ success: false, error: 'Server error detecting emergency' });
    }
};

module.exports = {
    askLegalQuestion,
    getChatSessions,
    getChatSessionById,
    deleteChatSession,
    findNearbyHelpController,
    getRelevantLawsController,
    detectEmergencyController
};
