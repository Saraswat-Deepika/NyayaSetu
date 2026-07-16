require('dotenv').config();
const axios = require('axios');

async function testGemini() {
    const geminiKey = process.env.GEMINI_API_KEY;
    console.log("Using key:", geminiKey);
    const payload = {
        contents: [{
            parts: [
                {
                    inlineData: {
                        mimeType: "audio/webm;codecs=opus",
                        data: "UklGRiQAAABXRUJNNmBwaWF" // dummy base64
                    }
                },
                { text: "test" }
            ]
        }]
    };
    
    try {
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log("Success:", response.data);
    } catch (err) {
        console.error("Error:", err.response?.data || err.message);
    }
}
testGemini();
