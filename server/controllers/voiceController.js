const fs = require('fs');
const { transcribeAudio } = require('../services/whisperService');
const banditService = require('../services/banditService');
const { matchLaws } = require('../services/lawService');
const { checkEmergency } = require('../services/emergencyService');
const VoiceHistory = require('../models/VoiceHistory');
const ChatSession = require('../models/ChatSession'); // Keeping for backward compatibility if needed

const transcribeAudioOnly = async (req, res) => {
    let filePathToClean = null;
    
    try {
        console.log(`[voiceController] Received request to transcribe audio.`);
        
        if (!req.file) {
            console.error('[voiceController] Validation Failed: No audio file uploaded');
            return res.status(400).json({ success: false, error: 'No audio file uploaded', location: 'voiceController.js line 15' });
        }

        filePathToClean = req.file.path;
        console.log(`[voiceController] File received. Path: ${req.file.path}, Size: ${req.file.size} bytes, MimeType: ${req.file.mimetype}`);

        // Validate file exists on disk
        if (!fs.existsSync(req.file.path)) {
            console.error('[voiceController] Validation Failed: Uploaded file does not exist on disk.');
            return res.status(400).json({ success: false, error: 'Uploaded file does not exist on disk', location: 'voiceController.js line 22' });
        }

        // Validate file size (e.g. 50MB limit)
        if (req.file.size > 50 * 1024 * 1024) {
            console.error('[voiceController] Validation Failed: File size exceeds 50MB limit.');
            return res.status(400).json({ success: false, error: 'File size exceeds limit', location: 'voiceController.js line 28' });
        }
        
        // Supported extensions are handled by multer, but we can do a quick key check here
        const geminiKey = process.env.GEMINI_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;
        const groqKey = process.env.GROQ_API_KEY;
        
        if ((!geminiKey || geminiKey === 'dummy_key') && (!openaiKey || openaiKey === 'dummy_key') && (!groqKey || groqKey === 'dummy_key')) {
             console.error('[voiceController] Validation Failed: No transcription API keys configured.');
             return res.status(500).json({ success: false, error: 'Server configuration error: No transcription API keys are set.', location: 'voiceController.js line 38' });
        }

        const language = req.body.language || 'English';
        console.log(`[voiceController] Calling transcribeAudio for language: ${language}`);
        
        const transcript = await transcribeAudio(req.file.path, language, req.file.mimetype);

        console.log(`[voiceController] Transcription successful.`);
        res.json({ success: true, text: transcript, transcript: transcript }); // return both text and transcript for frontend compatibility
        
    } catch (error) {
        console.error("[voiceController] Transcription Error Caught:", error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Server error during transcription',
            location: error.location || 'voiceController.js catch block' 
        });
    } finally {
        if (filePathToClean && fs.existsSync(filePathToClean)) {
            try {
                fs.unlinkSync(filePathToClean);
                console.log(`[voiceController] Cleaned up temporary file: ${filePathToClean}`);
            } catch (cleanupError) {
                console.error(`[voiceController] Failed to clean up file ${filePathToClean}:`, cleanupError);
            }
        }
    }
};

// 2. Process the text query using existing RAG pipeline
const processVoiceQuery = async (req, res) => {
    try {
        const { transcript, language } = req.body;
        
        if (!transcript) {
            return res.status(400).json({ error: 'Transcript is required' });
        }

        const emergencyResult = checkEmergency(transcript);
        let matchedLaws = [];
        let category = 'General Legal';
        let legalResponse = '';
        let confidenceScore = 0.8;

        const [legalCheck, classifiedCategory] = await Promise.all([
            banditService.isLegalQuery(transcript),
            banditService.classifyCategory(transcript)
        ]);

        if (!legalCheck) {
            legalResponse = `I am NyayaSetu, your AI Legal Assistant for Indian law. I can only assist with legal queries, citizen rights, or drafting legal documents.`;
        } else {
            category = classifiedCategory || 'Property Law';
            let selectedStrategy = 'GeminiLLM';

            try {
                const strategyResult = await banditService.getBestStrategy(category);
                selectedStrategy = strategyResult.selectedArm;
                confidenceScore = strategyResult.confidence === Infinity ? 0.95 : strategyResult.confidence;
                await banditService.incrementSelection(category, selectedStrategy);

                const [generatedResponse, lawsResult] = await Promise.all([
                    banditService.generateAnswerByStrategy(selectedStrategy, transcript, category, [], language),
                    matchLaws(transcript, language || 'English')
                ]);
                legalResponse = generatedResponse;
                matchedLaws = lawsResult;
            } catch (err) {
                console.error("Bandit selection failed, fallback to direct generation:", err);
                const { getLegalGuidance } = require('../services/groqService');
                const [fallbackResponse, lawsResult] = await Promise.all([
                    getLegalGuidance(transcript, [], language),
                    matchLaws(transcript, language || 'English')
                ]);
                legalResponse = fallbackResponse;
                matchedLaws = lawsResult;
            }
        }

        // Parse acts and sections
        const acts = matchedLaws.map(l => l.name).filter(Boolean);
        const sections = matchedLaws.map(l => l.section).filter(Boolean);
        
        const responseSummary = {
            response: legalResponse,
            acts: acts.length > 0 ? acts : ['No specific acts found'],
            sections: sections.length > 0 ? sections : ['Consult a lawyer for details'],
            nextSteps: [
                'Review the provided acts and sections',
                'Gather necessary documents',
                'Consult with a legal professional if needed'
            ],
            confidenceScore,
            citations: matchedLaws.map(l => l.title || l.actName).slice(0, 3)
        };

        // Create VoiceHistory record
        let newHistory = null;
        if (req.user) {
            newHistory = await VoiceHistory.create({
                userId: req.user._id,
                language: language || 'English',
                transcript,
                responseSummary,
                status: 'Processed'
            });
        }

        res.json({
            success: true,
            data: responseSummary,
            history: newHistory,
            laws: matchedLaws,
            emergency: emergencyResult
        });

    } catch (error) {
        console.error("Processing Error:", error);
        res.status(500).json({ error: 'Server error during processing' });
    }
};

// 3. Get User Voice History
const getVoiceHistory = async (req, res) => {
    try {
        const history = await VoiceHistory.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch voice history' });
    }
};

// 4. Delete Voice History
const deleteVoiceHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const historyItem = await VoiceHistory.findOne({ _id: id, userId: req.user._id });
        
        if (!historyItem) {
            return res.status(404).json({ error: 'History not found' });
        }

        await VoiceHistory.deleteOne({ _id: id });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete voice history' });
    }
};

// Keeping the original one exported for any backward compatibility (if some other page hits /voice/transcribe expecting full RAG)
// But we will override the route inside voice.js
module.exports = { 
    transcribeAudioOnly, 
    processVoiceQuery, 
    getVoiceHistory, 
    deleteVoiceHistory 
};
