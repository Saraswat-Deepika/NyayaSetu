const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

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

const getLegalGuidance = async (userQuery, language) => {
    try {
        const systemInstruction = `You are a legal aid assistant for India, answer in ${language || 'English'} based on user language, provide rights, steps, and legal draft templates.`;
        
        const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
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
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
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
        console.warn("Falling back to raw text due to cleanup failure.");
        return rawText; // Fallback to raw text if it fails
    }
};

const generateDocumentSummary = async (documentText, targetLanguage) => {
    try {
        const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: { responseMimeType: "application/json" }
        });
        const prompt = `You are an expert Indian legal assistant. Analyze the following legal document text and extract structured information, section-wise summaries, simple language explanations, legal risks, and a timeline.

Output valid JSON exactly matching this schema:
{
  "structuredData": {
    "documentType": "string (e.g. FIR, Court Order, Rent Agreement, Contract)",
    "partiesInvolved": ["string"],
    "courtName": "string or null",
    "caseNumber": "string or null",
    "judgeName": "string or null",
    "filingDate": "string or null",
    "relevantSections": ["string (e.g. Section 482 CrPC)"],
    "petitioner": "string or null",
    "respondent": "string or null",
    "legalKeywords": ["string"]
  },
  "aiSummary": {
    "documentOverview": "string",
    "partiesInvolved": "string",
    "factsOfCase": "string",
    "legalIssues": "string",
    "decisionOutcome": "string",
    "keyTakeaways": ["string"]
  },
  "simpleLanguageSummary": "string (A complete plain English explanation of the entire document that a non-lawyer can understand)",
  "riskAnalysis": [
    {
      "issue": "string (e.g. Missing signatures, High penalty)",
      "severity": "string (Must be exactly 'Green', 'Yellow', or 'Red')",
      "description": "string"
    }
  ],
  "timeline": [
    {
      "date": "string (e.g. 10 Jan 2025)",
      "event": "string"
    }
  ],
  "confidenceScores": {
    "ocrAccuracy": "number (0-100, estimate based on text messiness)",
    "summaryConfidence": "number (0-100)",
    "entityExtractionConfidence": "number (0-100)"
  }
}

Document Text:
${documentText}`;
        const result = await generateContentWithRetry(model, prompt);
        const text = result.response.text();
        let summaryJson = JSON.parse(text);

        // If target language is specified and not English, translate the summary
        if (targetLanguage && targetLanguage.toLowerCase() !== 'english') {
            console.log(`[Gemini API] Translating summary to ${targetLanguage}...`);
            try {
                summaryJson = await translateSummary(summaryJson, targetLanguage);
            } catch (transError) {
                console.error(`[Gemini API] Failed to translate summary to ${targetLanguage}:`, transError);
                // Return English version if translation fails rather than throwing
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
        const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: { responseMimeType: "application/json" }
        });
        const prompt = `You are an expert legal translator. Translate the following JSON document analysis into ${targetLanguage}.
Maintain the exact same JSON structure, only translate the string values. DO NOT translate keys.
For "riskAnalysis.severity", keep the exact values 'Green', 'Yellow', or 'Red'.

JSON to translate:
${JSON.stringify(analysisJson)}

Output valid JSON exactly matching the input structure.`;
        
        const result = await generateContentWithRetry(model, prompt);
        const text = result.response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Translate Error:", error);
        throw new Error("Failed to translate document summary: " + error.message);
    }
};

module.exports = { getLegalGuidance, generateDocumentSummary, cleanupOCRText, translateSummary };
