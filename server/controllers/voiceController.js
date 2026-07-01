const { transcribeAudio } = require('../services/whisperService');
const banditService = require('../services/banditService');
const Case = require('../models/Case');
const ChatSession = require('../models/ChatSession');
const { matchLaws } = require('../services/lawService');
const { checkEmergency } = require('../services/emergencyService');

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
        const sessionId = req.body.sessionId;

        // Call whisperService to transcribe
        const transcript = await transcribeAudio(req.file.path, language);

        // Check if the query is a legal query
        const emergencyResult = checkEmergency(transcript);
        let matchedLaws = [];

        // 1. Run legal query check and classification concurrently to save latency
        const [legalCheck, classifiedCategory] = await Promise.all([
            banditService.isLegalQuery(transcript),
            banditService.classifyCategory(transcript)
        ]);

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

            let chatSession = null;
            if (req.user) {
                if (sessionId) {
                    chatSession = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
                }

                if (chatSession) {
                    chatSession.messages.push({ role: 'user', content: transcript });
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
                    const titleWords = transcript.split(/\s+/).slice(0, 6).join(' ');
                    const chatTitle = titleWords.length < transcript.length ? `${titleWords}...` : titleWords;

                    chatSession = new ChatSession({
                        userId: req.user._id,
                        title: chatTitle,
                        messages: [
                            { role: 'user', content: transcript },
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

            return res.json({
                transcription: transcript,
                transcript: transcript,
                legalResponse: nonLegalMessage,
                selectedStrategy: 'None',
                confidenceScore: 1.0,
                case: null,
                sessionId: chatSession ? chatSession._id : null,
                chatSession: chatSession,
                laws: [],
                emergency: emergencyResult
            });
        }

        // Classify category and select strategy using banditService
        let category = classifiedCategory || 'Property Law';
        let selectedStrategy = 'GeminiLLM';
        let confidenceScore = 0.8;
        let legalResponse = '';

        try {
            const strategyResult = await banditService.getBestStrategy(category);
            selectedStrategy = strategyResult.selectedArm;
            confidenceScore = strategyResult.confidence;

            await banditService.incrementSelection(category, selectedStrategy);

            // Generate answer and match laws in parallel to reduce sequential API roundtrips
            const [generatedResponse, lawsResult] = await Promise.all([
                banditService.generateAnswerByStrategy(selectedStrategy, transcript, category, history, language),
                matchLaws(transcript, language || 'English')
            ]);
            legalResponse = generatedResponse;
            matchedLaws = lawsResult;
        } catch (banditErr) {
            console.error("⚠️ Voice Bandit selection failed. Falling back to direct LLM:", banditErr.message);
            const { getLegalGuidance } = require('../services/geminiService');
            selectedStrategy = 'GeminiLLM';
            
            // Fallback generation and laws matching in parallel!
            const [fallbackResponse, lawsResult] = await Promise.all([
                getLegalGuidance(transcript, history, language),
                matchLaws(transcript, language || 'English')
            ]);
            legalResponse = fallbackResponse;
            matchedLaws = lawsResult;
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
                    feedback: 'none',
                    laws: matchedLaws,
                    emergency: emergencyResult
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
                            feedback: 'none',
                            laws: matchedLaws,
                            emergency: emergencyResult
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
            chatSession: chatSession,
            laws: matchedLaws,
            emergency: emergencyResult
        });

    } catch (error) {
        console.error("Voice Controller Error:", error);
        res.status(500).json({ error: 'Server error during voice processing' });
    }
};

module.exports = { handleVoiceUpload };
