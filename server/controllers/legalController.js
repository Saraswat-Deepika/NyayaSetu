const { getLegalGuidance } = require('../services/geminiService');
const Case = require('../models/Case');

const askLegalQuestion = async (req, res) => {
    try {
        // Accept both 'question' (from frontend) and 'query' (legacy/develop)
        const { question, query, history, language, category, title } = req.body;
        const userQuery = question || query;
        
        if (!userQuery) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // Get AI response from Gemini
        const guidance = await getLegalGuidance(userQuery, history, language);

        // Save response to Case model if user is logged in
        let newCase = null;
        if (req.user) {
            newCase = new Case({
                userId: req.user._id,
                title: title || 'Legal Query',
                description: userQuery,
                category: category || 'RTI',
                aiSummary: guidance,
                language: language || 'english'
            });
            await newCase.save();
        }

        res.status(201).json({
            success: true,
            answer: guidance,
            guidance: guidance,
            response: guidance, // Compat with develop/legacy
            case: newCase
        });
    } catch (error) {
        console.error("Error in askLegalQuestion:", error);
        return res.status(500).json({ success: false, error: error.message || 'Server error' });
    }
};

module.exports = { askLegalQuestion };
