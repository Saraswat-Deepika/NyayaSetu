const { getLegalGuidance } = require('../services/geminiService');
const Case = require('../models/Case');
const banditService = require('../services/banditService');

const askLegalQuestion = async (req, res) => {
    try {
        // Accept both 'question' (from frontend) and 'query' (legacy/develop)
        const { question, query, history, language, category: reqCategory, title } = req.body;
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
            const nonLegalMessage = `I am NyayaSetu, your AI Legal Assistant for Indian law. I can only assist with legal queries, citizen rights, or drafting legal documents. 

Your question does not seem to be legal-related. Please ask a question related to laws, templates, police, courts, or your rights in India (e.g., "What are the rules of eviction?" or "How to file an FIR?").`;
            
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

        res.status(201).json({
            success: true,
            answer: guidance,
            guidance: guidance,
            response: guidance, // Compat with develop/legacy
            selectedStrategy: selectedStrategy,
            confidenceScore: confidenceScore === Infinity ? 0.95 : confidenceScore,
            case: newCase
        });
    } catch (error) {
        console.error("Error in askLegalQuestion:", error);
        return res.status(500).json({ success: false, error: error.message || 'Server error' });
    }
};

module.exports = { askLegalQuestion };
