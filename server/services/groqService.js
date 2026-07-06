const { OpenAI } = require('openai');
const { searchRelevantDocs } = require('./ragService');

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Centrally manages chat completions with Groq, including rate-limit (429) retries.
 */
const generateChatCompletion = async (prompt, systemInstruction = null, jsonMode = false, maxRetries = 4) => {
    const messages = [];
    if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await groq.chat.completions.create({
                model: GROQ_MODEL,
                messages,
                temperature: 0.1,
                ...(jsonMode ? { response_format: { type: "json_object" } } : {})
            });
            return response.choices[0].message.content;
        } catch (error) {
            // Check for rate limits (429)
            if (error.status === 429 || (error.message && error.message.includes('429'))) {
                const backoffTime = attempt * 3000;
                console.warn(`[Groq API] Rate limit hit (Attempt ${attempt}/${maxRetries}). Retrying in ${backoffTime / 1000} seconds...`);
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
        const langKey = (language || 'english').toLowerCase();
        console.log('🧪 [MOCK MODE] Generating legal guidance in:', langKey);
        
        if (langKey === 'hindi') {
            return `### Problem Understanding (समस्या की समझ)
आपके मकान मालिक द्वारा आपको बिना किसी पूर्व सूचना या नोटिस के घर से बेदखल करने की धमकी दी जा रही है।

### Relevant Law (प्रासंगिक कानून)
भारत में, यह मामला **संपत्ति हस्तांतरण अधिनियम, 1882** (धारा 106 के तहत 15 दिनों का नोटिस आवश्यक है) और संबंधित राज्य के **किराया नियंत्रण अधिनियम** के अंतर्गत आता है।

### Suggested Actions (सुझाए गए कदम)
1. अपने रेंट एग्रीमेंट में नोटिस की अवधि की जांच करें।
2. मकान मालिक को लिखित रूप में सूचित करें कि बिना नोटिस बेदखली गैरकानूनी है।
3. यदि धमकी जारी रहती है, तो कानूनी वकील से सलाह लें।

### Required Documents (आवश्यक दस्तावेज)
- पंजीकृत रेंट एग्रीमेंट (Rent Agreement)
- किराया भुगतान रसीदें (Rent Receipts)

### Authorities to Contact (संपर्क करने के लिए प्राधिकरण)
- स्थानीय किराया नियंत्रक (Rent Controller)
- सिविल कोर्ट (Civil Court)

### Disclaimer (अस्वीकरण)
यह परीक्षण के उद्देश्यों के लिए एक नकली प्रतिक्रिया है। (This is a mock response for testing).`;
        } else if (langKey === 'hinglish') {
            return `### Problem Understanding
Aapka landlord aapko bina kisi prior notice ya agreement eviction period ke ghar se nikalne ki dhamki de raha hai.

### Relevant Law
India me, yeh case **Transfer of Property Act, 1882** (Section 106 ke tehat 15-day notice period jaruri hai) aur respective state ke **Rent Control Act** ke under aata hai.

### Suggested Actions
1. Apne rent agreement me notice period aur clauses check karein.
2. Landlord ko written me message karein ki bina legal notice eviction illegal hai.
3. Agar dhamki continue rehti hai, toh local advocate se advice lein.

### Required Documents
- Registered Rent Agreement
- Rent Payment receipts

### Authorities to Contact
- Local Rent Controller (Rent Control Act ke under)
- Civil Court (Stay order/injunction file karne ke liye)

### Disclaimer
Yeh guidance testing purpose ke liye ek mock response hai.`;
        }

        // Default to English Mock (with premium layout structure)
        return `### Problem Understanding
You are facing eviction from your rented flat without proper notice from your landlord.

### Relevant Law
In India, this is governed under the **Transfer of Property Act, 1882** (Section 106 requires a 15-day notice for eviction) and state-specific **Rent Control Acts**.

### Suggested Actions
1. Review your rent agreement for the notice period.
2. Send a reply in writing to your landlord requesting proper notice.
3. Consult a legal advocate if the threat persists.

### Required Documents
- Registered Rent Agreement
- Rent Payment Receipts

### Authorities to Contact
- Local Rent Controller (under Rent Control Act)
- Civil Court (to file for a temporary injunction)

### Disclaimer
This is a mock legal response for testing purposes.`;
    }

    try {
        const docs = await searchRelevantDocs(userQuery);
        if (!docs || docs.length === 0) {
            console.log("ℹ️ getLegalGuidance: No docs found. Returning polite fallback.");
            return "I couldn't find this specific information in the current legal database.";
        }

        const context = docs.map((d, i) => `[Document ${i + 1}]:\n${d.pageContent}`).join('\n\n');

        const systemInstruction = `You are NyayaSetu, an AI Legal Assistant for India.
CRITICAL: Every URL, website address, or link you mention MUST be strictly formatted as clickable markdown links, e.g. [Cyber Crime Portal](https://cybercrime.gov.in/) or [Women Helpline Portal](http://www.ncwhelpline.in/). Never write raw, unclickable links like "https://cybercrime.gov.in/" or "cybercrime.gov.in". Make sure the links are 100% correct official portals.
You must answer the user's legal question strictly based ONLY on the provided document context.
Do not add any unsupported legal facts, do not guess, and do not fabricate any information.

If the provided context does not contain relevant information to answer the user's specific query, you MUST respond with exactly the following message and nothing else:
"I couldn't find this specific information in the current legal database."

Provide ONLY the absolute necessary information. Do not include any conversational filler, introductory text, or extra context.
Use short, simple sentences and clear bullet points or step-by-step lists. It must be extremely easy for a common citizen to understand.
Respond in the language: ${language || 'English'}. Ensure the entire response (including explanation, headings, and fallback message if triggered) is returned in this language.
You MUST format your output under these exact headings and nothing else:
### Problem Understanding
### Relevant Law
### Suggested Actions (Step-by-step)
### Required Documents
### Authorities to Contact
### Disclaimer
(Include a short, standard 1-sentence legal disclaimer)`;

        const result = await generateChatCompletion(`Context:\n${context}\n\nUser Query: ${userQuery}`, systemInstruction, false);
        return result;
    } catch (error) {
        console.error("Groq AI Error:", error);
        throw new Error("Failed to get legal guidance.");
    }
};

const cleanupOCRText = async (rawText) => {
    try {
        const prompt = `You are a legal text processing assistant. The following text was extracted via OCR from a legal document and may contain messy artifacts, broken words, or typos. 
Please carefully read and clean up the text. 
CRITICAL RULES:
- Fix spelling mistakes and broken words.
- Fix grammar where obvious.
- DO NOT hallucinate, summarize, or change the original meaning of the text.
- ONLY output the cleaned up text, nothing else.

Raw Text:
${rawText}`;
        
        const result = await generateChatCompletion(prompt, null, false);
        return result;
    } catch (error) {
        console.error("OCR Cleanup Error:", error);
        console.warn("Falling back to raw text due to cleanup failure.");
        return rawText; // Fallback to raw text if it fails
    }
};

const generateDocumentSummary = async (documentText, targetLanguage) => {
    try {
        const systemPrompt = `You are an expert Indian legal assistant. Analyze the following legal document text and extract structured information, section-wise summaries, simple language explanations, legal risks, and a timeline.`;

        const prompt = `Document Text:\n${documentText}`;
        const result = await generateChatCompletion(prompt, systemPrompt, true);
        let summaryJson = JSON.parse(result);

        // If target language is specified and not English, translate the summary
        if (targetLanguage && targetLanguage.toLowerCase() !== 'english') {
            console.log(`[Groq API] Translating summary to ${targetLanguage}...`);
            try {
                summaryJson = await translateSummary(summaryJson, targetLanguage);
            } catch (transError) {
                console.error(`[Groq API] Failed to translate summary to ${targetLanguage}:`, transError);
                // Return English version if translation fails rather than throwing
            }
        }

        return summaryJson;
    } catch (error) {
        console.error("Groq Summary Error:", error);
        throw new Error("Failed to generate document summary: " + error.message);
    }
};

const translateSummary = async (analysisJson, targetLanguage) => {
    try {
        const systemPrompt = `You are an expert legal translator. Translate the following JSON document analysis into ${targetLanguage}.
Maintain the exact same JSON structure, only translate the string values. DO NOT translate keys.
For "riskAnalysis.severity", keep the exact values 'Green', 'Yellow', or 'Red'.`;

        const prompt = `JSON to translate:\n${JSON.stringify(analysisJson)}\n\nOutput valid JSON exactly matching the input structure.`;
        const result = await generateChatCompletion(prompt, systemPrompt, true);
        return JSON.parse(result);
    } catch (error) {
        console.error("Groq Translate Error:", error);
        throw new Error("Failed to translate document summary: " + error.message);
    }
};

module.exports = {
    generateChatCompletion,
    getLegalGuidance,
    generateDocumentSummary,
    cleanupOCRText,
    translateSummary
};
