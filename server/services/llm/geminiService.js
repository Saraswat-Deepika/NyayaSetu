const { getGenAI, getGeminiModel } = require('../../config/gemini');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateContentWithRetry = async (model, prompt, maxRetries = 4) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await model.generateContent(prompt);
        } catch (error) {
            if (error.status === 429 || (error.message && error.message.includes('429'))) {
                const backoffTime = attempt * 3000;
                console.warn(`[Gemini API] Rate limit hit (Attempt ${attempt}/${maxRetries}). Retrying in ${backoffTime / 1000} seconds...`);
                if (attempt === maxRetries) throw error;
                await sleep(backoffTime);
            } else {
                throw error;
            }
        }
    }
};

const getLegalGuidance = async (userQuery, historyOrLanguage, languageOrUndefined) => {
    let history = [];
    let language = 'English';

    if (Array.isArray(historyOrLanguage)) {
        history = historyOrLanguage;
        language = languageOrUndefined || 'English';
    } else if (typeof historyOrLanguage === 'string') {
        language = historyOrLanguage;
    }

    if (process.env.MOCK_AI === 'true') {
        return `### Problem Understanding\nYou are facing an issue for testing.\n### Disclaimer\nThis is a mock legal response for testing purposes.`;
    }

    try {
        const systemInstruction = `You are NyayaSetu, an AI Legal Assistant for India.
Provide ONLY the absolute necessary information. Do not include any conversational filler, introductory text, or extra context.
Use short, simple sentences and clear bullet points or step-by-step lists. It must be extremely easy for a common citizen to understand.
Respond in the language: ${language || 'English'}. Ensure the entire response (including explanation and layout headings) is returned in this language.
You MUST format your output under these exact headings and nothing else:
### Problem Understanding
### Relevant Law
### Suggested Actions (Step-by-step)
### Required Documents
### Authorities to Contact
### Disclaimer`;
        
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ 
            model: getGeminiModel(),
            systemInstruction: systemInstruction 
        });

        const result = await generateContentWithRetry(model, userQuery);
        return result.response.text();
    } catch (error) {
        console.error("Gemini AI Error:", error);
        throw new Error("Failed to get legal guidance.");
    }
};

const cleanupOCRText = async (rawText) => {
    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: getGeminiModel() });
        const prompt = `You are a legal text processing assistant. The following text was extracted via OCR from a legal document and may contain messy artifacts, broken words, or typos. 
Please carefully read and clean up the text. 
CRITICAL RULES:
- Fix spelling mistakes and broken words.
- Fix grammar where obvious.
- DO NOT hallucinate, summarize, or change the original meaning of the text.
- ONLY output the cleaned up text, nothing else.

Raw Text:
${rawText}`;
        
        const result = await generateContentWithRetry(model, prompt);
        return result.response.text();
    } catch (error) {
        console.error("OCR Cleanup Error:", error);
        return rawText; 
    }
};

const generateDocumentSummary = async (documentText, targetLanguage) => {
    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ 
            model: getGeminiModel(),
            generationConfig: { responseMimeType: "application/json" }
        });
        const prompt = `You are an expert Indian legal assistant. Analyze the following legal document text and extract structured information, section-wise summaries, simple language explanations, legal risks, and a timeline.

Output valid JSON exactly matching this schema:
{
  "structuredData": {},
  "aiSummary": {},
  "simpleLanguageSummary": "string",
  "citizenSummary": {},
  "riskAnalysis": [],
  "timeline": [],
  "confidenceScores": {}
}

Document Text:
${documentText}`;
        const result = await generateContentWithRetry(model, prompt);
        let summaryJson = JSON.parse(result.response.text());

        if (targetLanguage && targetLanguage.toLowerCase() !== 'english') {
            try {
                summaryJson = await translateSummary(summaryJson, targetLanguage);
            } catch (transError) {
                console.error(`[Gemini API] Failed to translate summary to ${targetLanguage}:`, transError);
            }
        }
        return summaryJson;
    } catch (error) {
        console.error("Gemini Summary Error:", error);
        throw new Error("Failed to generate document summary: " + error.message);
    }
};

const translateSummary = async (analysisJson, targetLanguage) => {
    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ 
            model: getGeminiModel(),
            generationConfig: { responseMimeType: "application/json" }
        });
        const prompt = `You are an expert legal translator. Translate the following JSON document analysis into ${targetLanguage}.
Maintain the exact same JSON structure, only translate the string values. DO NOT translate keys.
For "riskAnalysis.severity", keep the exact values 'Green', 'Yellow', or 'Red'.

JSON to translate:
${JSON.stringify(analysisJson)}

Output valid JSON exactly matching the input structure.`;
        
        const result = await generateContentWithRetry(model, prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("Gemini Translate Error:", error);
        throw new Error("Failed to translate document summary: " + error.message);
    }
};

module.exports = { getLegalGuidance, generateDocumentSummary, cleanupOCRText, translateSummary };
