const { getLegalGuidance } = require('../services/geminiService');
const Case = require('../models/Case');
const ChatSession = require('../models/ChatSession');
const banditService = require('../services/banditService');

const askLegalQuestion = async (req, res) => {
    try {
        // Accept both 'question' (from frontend) and 'query' (legacy/develop)
        // Also accept optional sessionId
        const { question, query, history, language, category: reqCategory, title, sessionId } = req.body;
        const userQuery = question || query;
        
        if (!userQuery) {
            return res.status(400).json({ error: 'Question is required' });
        }

        let category = reqCategory;
        let selectedStrategy = 'GeminiLLM';
        let confidenceScore = 0.8;
        let guidance = '';

        // Check if the query is a legal query
        const legalCheck = await banditService.isLegalQuery(userQuery);
        if (!legalCheck) {
            let nonLegalMessage = "";
            try {
                const redirectSystemPrompt = `You are NyayaSetu, an AI Legal Assistant for India.
The user asked a non-legal, conversational, or off-topic question: "${userQuery}".
Provide a friendly response (1-3 sentences) in the language of the query. 
Politely greet them if it is a greeting. If it is a technical, personal, or off-topic question, briefly address it or suggest how they can resolve it, and then politely remind them that you can help with legal queries (such as consumer complaints for defective products/warranties, police reports, tenant rights, etc.) and ask how you can assist them legally.`;
                
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const result = await model.generateContent(redirectSystemPrompt);
                nonLegalMessage = result.response.text();
            } catch (err) {
                console.error("Failed to generate custom non-legal redirect:", err);
                nonLegalMessage = `I am NyayaSetu, your AI Legal Assistant for Indian law. I can only assist with legal queries, citizen rights, or drafting legal documents. 

If this is a product defect or warranty issue, you might have rights under the Consumer Protection Act. Please let me know how I can assist you legally.`;
            }
            
            return res.status(201).json({
                success: true,
                answer: nonLegalMessage,
                guidance: nonLegalMessage,
                response: nonLegalMessage,
                selectedStrategy: 'None',
                confidenceScore: 1.0,
                case: null
            });
        }

        try {
            // 1. Classify the user query's category if not provided or generic
            if (!category || category === 'RTI' || category === 'Other') {
                category = await banditService.classifyCategory(userQuery);
            }

            // 2. Select the optimal strategy (arm) using UCB1
            const strategyResult = await banditService.getBestStrategy(category);
            selectedStrategy = strategyResult.selectedArm;
            confidenceScore = strategyResult.confidence;

            // 3. Increment selection count
            await banditService.incrementSelection(category, selectedStrategy);

            // 4. Generate answer using the selected strategy
            guidance = await banditService.generateAnswerByStrategy(selectedStrategy, userQuery, category, history, language);
        } catch (banditErr) {
            console.error("⚠️ Bandit answer selection failed. Falling back to direct LLM:", banditErr.message);
            selectedStrategy = 'GeminiLLM';
            guidance = await getLegalGuidance(userQuery, history, language);
        }

        // Save response to Case model if user is logged in
        let newCase = null;
        if (req.user) {
            newCase = new Case({
                userId: req.user._id,
                title: title || `${category} Query`,
                description: userQuery,
                category: category,
                aiSummary: guidance,
                language: language || 'english',
                selectedStrategy: selectedStrategy,
                feedbackStatus: 'none'
            });
            await newCase.save();
        }

        // Save messages in ChatSession if user is logged in
        let chatSession = null;
        if (req.user) {
            if (sessionId) {
                // Find existing chat session
                chatSession = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
            }

            if (chatSession) {
                // Append to existing chat session
                chatSession.messages.push({
                    role: 'user',
                    content: userQuery
                });
                chatSession.messages.push({
                    role: 'ai',
                    content: guidance,
                    queryId: newCase?._id,
                    strategy: selectedStrategy,
                    feedback: 'none'
                });
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
                        {
                            role: 'ai',
                            content: guidance,
                            queryId: newCase?._id,
                            strategy: selectedStrategy,
                            feedback: 'none'
                        }
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
            chatSession: chatSession
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

module.exports = {
    askLegalQuestion,
    getChatSessions,
    getChatSessionById,
    deleteChatSession
};
