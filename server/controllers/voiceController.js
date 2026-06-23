const { transcribeAudio } = require('../services/whisperService');
const banditService = require('../services/banditService');
const Case = require('../models/Case');

const handleVoiceUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        let history = [];
        if (req.body.history) {
            try {
                history = JSON.parse(req.body.history);
            } catch (e) {
                console.error("Failed to parse history from request body:", e);
            }
        }

        const language = req.body.language || 'English';

        // Call whisperService to transcribe
        const transcript = await transcribeAudio(req.file.path, language);

        // Check if the query is a legal query
        const legalCheck = await banditService.isLegalQuery(transcript);
        if (!legalCheck) {
            const nonLegalMessage = `I am NyayaSetu, your AI Legal Assistant for Indian law. I can only assist with legal queries, citizen rights, or drafting legal documents. 

Your question does not seem to be legal-related. Please ask a question related to laws, templates, police, courts, or your rights in India (e.g., "What are the rules of eviction?" or "How to file an FIR?").`;
            
            return res.json({
                transcription: transcript,
                transcript: transcript,
                legalResponse: nonLegalMessage,
                selectedStrategy: 'None',
                confidenceScore: 1.0,
                case: null
            });
        }

        // Classify category and select strategy using banditService
        let category = 'Property Law';
        let selectedStrategy = 'GeminiLLM';
        let confidenceScore = 0.8;
        let legalResponse = '';

        try {
            category = await banditService.classifyCategory(transcript);
            const strategyResult = await banditService.getBestStrategy(category);
            selectedStrategy = strategyResult.selectedArm;
            confidenceScore = strategyResult.confidence;

            await banditService.incrementSelection(category, selectedStrategy);
            legalResponse = await banditService.generateAnswerByStrategy(selectedStrategy, transcript, category, history, language);
        } catch (banditErr) {
            console.error("⚠️ Voice Bandit selection failed. Falling back to direct LLM:", banditErr.message);
            const { getLegalGuidance } = require('../services/geminiService');
            selectedStrategy = 'GeminiLLM';
            legalResponse = await getLegalGuidance(transcript, history, language);
        }

        // Save to Case model
        let newCase = null;
        if (req.user) {
            newCase = new Case({
                userId: req.user._id,
                title: `Voice: ${category}`,
                description: transcript,
                category: category,
                aiSummary: legalResponse,
                language: language || 'english',
                selectedStrategy: selectedStrategy,
                feedbackStatus: 'none'
            });
            await newCase.save();
        }

        // Return both transcript and legal response as JSON
        res.json({
            transcription: transcript,
            transcript: transcript, // backward compat
            legalResponse: legalResponse,
            selectedStrategy: selectedStrategy,
            confidenceScore: confidenceScore === Infinity ? 0.95 : confidenceScore,
            case: newCase
        });

    } catch (error) {
        console.error("Voice Controller Error:", error);
        res.status(500).json({ error: 'Server error during voice processing' });
    }
};

module.exports = { handleVoiceUpload };
