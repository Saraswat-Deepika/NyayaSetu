const { transcribeAudio } = require('../services/whisperService');
const banditService = require('../services/banditService');
const Case = require('../models/Case');
const ChatSession = require('../models/ChatSession');

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
            let nonLegalMessage = "";
            try {
                const redirectSystemPrompt = `You are NyayaSetu, an AI Legal Assistant for India.
The user asked a non-legal, conversational, or off-topic question: "${transcript}".
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

        // Save messages in ChatSession if user is logged in
        let chatSession = null;
        const sessionId = req.body.sessionId;
        if (req.user) {
            if (sessionId) {
                // Find existing chat session
                chatSession = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
            }

            if (chatSession) {
                // Append to existing chat session
                chatSession.messages.push({
                    role: 'user',
                    content: transcript
                });
                chatSession.messages.push({
                    role: 'ai',
                    content: legalResponse,
                    queryId: newCase?._id,
                    strategy: selectedStrategy,
                    feedback: 'none'
                });
                chatSession.markModified('messages');
                await chatSession.save();
            } else {
                // Auto-generate title from the first 6 words of the transcript
                const titleWords = transcript.split(/\s+/).slice(0, 6).join(' ');
                const chatTitle = titleWords.length < transcript.length ? `${titleWords}...` : titleWords;

                // Create new chat session
                chatSession = new ChatSession({
                    userId: req.user._id,
                    title: chatTitle,
                    messages: [
                        { role: 'user', content: transcript },
                        {
                            role: 'ai',
                            content: legalResponse,
                            queryId: newCase?._id,
                            strategy: selectedStrategy,
                            feedback: 'none'
                        }
                    ]
                });
                await chatSession.save();
            }
        }

        // Return both transcript and legal response as JSON
        res.json({
            transcription: transcript,
            transcript: transcript, // backward compat
            legalResponse: legalResponse,
            selectedStrategy: selectedStrategy,
            confidenceScore: confidenceScore === Infinity ? 0.95 : confidenceScore,
            case: newCase,
            sessionId: chatSession ? chatSession._id : null,
            chatSession: chatSession
        });

    } catch (error) {
        console.error("Voice Controller Error:", error);
        res.status(500).json({ error: 'Server error during voice processing' });
    }
};

module.exports = { handleVoiceUpload };
