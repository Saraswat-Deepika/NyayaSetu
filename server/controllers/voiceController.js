const { transcribeAudio } = require('../services/whisperService');
const { getLegalGuidance } = require('../services/geminiService');

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

        // Call geminiService for legal guidance on transcript
        const legalResponse = await getLegalGuidance(transcript, history, language);

        // Return both transcript and legal response as JSON
        res.json({
            transcription: transcript,
            transcript: transcript, // backward compat
            legalResponse: legalResponse
        });

    } catch (error) {
        console.error("Voice Controller Error:", error);
        res.status(500).json({ error: 'Server error during voice processing' });
    }
};

module.exports = { handleVoiceUpload };
