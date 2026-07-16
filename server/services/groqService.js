const { OpenAI } = require('openai');
const { searchRelevantDocs } = require('./ragService');

let aiClient;
let currentModel;

const geminiKey = process.env.GEMINI_API_KEY;
if (geminiKey && geminiKey !== 'dummy_key') {
    aiClient = null; // We will use Axios directly for Gemini models
    currentModel = 'gemini-1.5-flash';
} else {
    aiClient = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1'
    });
    currentModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
}

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
            if (currentModel.startsWith('gemini')) {
                const axios = require('axios');
                const parts = systemInstruction ? [{ text: systemInstruction }, { text: prompt }] : [{ text: prompt }];
                const payload = { 
                    contents: [{ parts }],
                    ...(jsonMode ? { generationConfig: { responseMimeType: "application/json" } } : {})
                };
                const geminiKey = process.env.GEMINI_API_KEY;
                
                const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.0-pro', 'gemini-pro'];
                let lastError = null;
                
                for (const model of modelsToTry) {
                    try {
                        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, payload, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 60000
                        });
                        
                        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) return text;
                    } catch (err) {
                        lastError = err;
                        console.warn(`[groqService] Gemini model ${model} failed:`, err.message);
                    }
                }
                
                // FINAL FREE FALLBACK IF ALL KEYS FAIL
                console.log("ℹ️ All Gemini models failed. Using Free Pollinations AI Fallback...");
                try {
                    const pollResponse = await axios.post('https://text.pollinations.ai/', {
                        messages: systemInstruction ? [{ role: 'system', content: systemInstruction }, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }],
                        jsonMode: jsonMode
                    }, { headers: { 'Content-Type': 'application/json' }, timeout: 60000 });
                    if (pollResponse.data) {
                        return typeof pollResponse.data === 'string' ? pollResponse.data : JSON.stringify(pollResponse.data);
                    }
                } catch (pollErr) {
                    console.error("Pollinations fallback also failed:", pollErr.message);
                }

                throw lastError || new Error("All AI models failed in groqService");
            } else {
                if (!aiClient) throw new Error("No OpenAI client available for non-Gemini models.");
                const response = await aiClient.chat.completions.create({
                    model: currentModel,
                    messages,
                    temperature: 0.1,
                    ...(jsonMode ? { response_format: { type: "json_object" } } : {})
                });
                return response.choices[0].message.content;
            }
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
        let context = "No external documents retrieved. Use your internal knowledge of Indian Law.";
        if (docs && docs.length > 0) {
            context = docs.map((d, i) => `[Document ${i + 1}]:\n${d.pageContent}`).join('\n\n');
        }

        const systemInstruction = `Your task is to answer legal queries in a structured, practical, and easy-to-understand format.

STRICT INSTRUCTIONS:
1. Answer ONLY the user's current query.
2. Use ONLY the retrieved legal context and database information.
3. Never answer a different question than the one asked by the user.
4. Convert legal language into simple language understandable by a non-lawyer.
5. Focus on "What should the user do next?" rather than legal theory.
6. Avoid unnecessary legal jargon, lengthy explanations, and excessive citations.
7. Mention only laws that are directly relevant to the user's question.
8. If no relevant information exists in the database, return: "No relevant legal information was found in the NyayaSetu legal database."
9. Respond in the language: ${language || 'English'}. Ensure the entire response (including explanation, headings, and fallback message if triggered) is returned in this language.
10. Every URL, website address, or link you mention MUST be strictly formatted as clickable markdown links, e.g. [Cyber Crime Portal](https://cybercrime.gov.in/). Never write raw, unclickable links.

Use EXACTLY the following output format:

### 🔍 Your Question
- Explain the user's issue in 1-2 simple sentences.

### 📄 Relevant Law
- Mention only relevant Acts, Sections, or Rules.
- For each law provide:
  - Law Name
  - Section Number
  - One-line explanation in simple language.

### 📌 What You Should Do
Provide practical and actionable steps. For each step use this structure:
1. **Action Title**
   - What the user should do.
   - Why this step is important.
   - Any useful tips or precautions.

Limit to 5-7 steps unless absolutely necessary.

### 📑 Required Documents
Create a table:
| Document | Why it is Needed |
|----------|------------------|
| Example Document | Purpose |

### 🏢 Authorities to Contact
Provide only relevant authorities. For each authority mention:
- Authority Name
- When to contact them
- Purpose

### ⚖️ Your Legal Rights
Mention 2-5 important rights the user should know.

### 🚨 When to Seek Immediate Help
- List emergency situations related to this query.

### 📍 Next Step
- Final concluding action to take right now.`;

        const promptConstraint = "";

        const result = await generateChatCompletion(`LEGAL CONTEXT:\n${context}\n\nUSER QUERY:\n${userQuery}${promptConstraint}`, systemInstruction, false);
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
        const systemPrompt = `You are an expert Indian legal assistant. Analyze the following legal document text and extract structured information.
YOU MUST RETURN ONLY VALID JSON. Do not include any markdown, introductory text, or conversational filler.
The JSON must strictly follow this exact schema:
{
  "structuredData": {
    "documentType": "string",
    "filingDate": "string",
    "caseNumber": "string",
    "judgeName": "string",
    "partiesInvolved": ["string"]
  },
  "aiSummary": {
    "documentOverview": "string",
    "partiesInvolved": "string",
    "keyTakeaways": ["string"],
    "factsOfCase": ["string"]
  },
  "simpleLanguageSummary": "string",
  "citizenSummary": {
    "whatThisDocumentIsAbout": "string",
    "whoIsInvolved": "string",
    "keyFactsAndDecisions": ["string"],
    "whatThisMeansForYou": "string"
  }
}`;

        const prompt = `Document Text:\n${documentText}`;
        const result = await generateChatCompletion(prompt, systemPrompt, true);
        
        let summaryJson;
        try {
            summaryJson = JSON.parse(result);
        } catch (parseError) {
            console.warn("[Groq API] Direct JSON parse failed. Attempting to extract JSON from markdown block...");
            const jsonMatch = result.match(/```(?:json)?([\s\S]*?)```/);
            if (jsonMatch && jsonMatch[1]) {
                summaryJson = JSON.parse(jsonMatch[1].trim());
            } else {
                throw new Error("Result is not valid JSON: " + result.substring(0, 50));
            }
        }

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

const getStrictRagGuidance = async (userQuery, docs, language = 'English', history = []) => {
    const context = (!docs || docs.length === 0) 
        ? "No external documents retrieved. Answer based on general Indian Law knowledge, but ask for clarification if facts are missing."
        : docs.map((d, i) => `[Source Document ${i + 1}: ${d.source || 'Unknown Act'}]\n${d.pageContent}`).join('\n\n---\n\n');

    let historyText = "";
    if (history && history.length > 0) {
        historyText = "PREVIOUS CONVERSATION:\n" + history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n') + "\n\n";
    }

    const systemInstruction = `You are NyayaSetu, an intelligent conversational legal assistant for India.
Your goal is to help users understand their legal issues and know exactly what action to take.
    
INSTRUCTIONS:
1. Maintain a friendly, helpful, and professional conversational tone.
2. If the user's information is incomplete (e.g. "My landlord wants me to leave"), ask clarifying questions (e.g. "Do you have a rental agreement?").
3. Use the provided LEGAL CONTEXT and PREVIOUS CONVERSATION to answer accurately.
4. Do not invent laws. If unsure, state it clearly.
5. Provide your response in the language: ${language}.

YOU MUST RETURN ONLY VALID JSON. Do not include markdown or filler text.
Your JSON must strictly follow this exact schema:
{
  "reply": "Your conversational response here. Use markdown for bolding, bullet points, and tables if needed.",
  "severity": "High Priority" | "Medium Priority" | "General Guidance",
  "category": "Criminal Law" | "Civil Law" | "Consumer Rights" | "Cyber Crime" | "Labour Law" | "Family Law" | "Property Law" | "Traffic Law" | "Other",
  "suggestedActions": ["Action 1", "Action 2"] // e.g. "Generate FIR Draft", "Connect Lawyer", "Find Police Station"
}`;

    try {
        const prompt = `${historyText}LEGAL CONTEXT:\n${context}\n\nCURRENT USER QUERY:\n${userQuery}`;
        const result = await generateChatCompletion(prompt, systemInstruction, true);
        
        let jsonResponse;
        try {
            jsonResponse = JSON.parse(result);
        } catch (e) {
            const jsonMatch = result.match(/```(?:json)?([\s\S]*?)```/);
            if (jsonMatch && jsonMatch[1]) {
                jsonResponse = JSON.parse(jsonMatch[1].trim());
            } else {
                // Fallback structure
                jsonResponse = {
                    reply: result.replace(/```(?:json)?/g, '').trim(),
                    severity: "General Guidance",
                    category: "Other",
                    suggestedActions: []
                };
            }
        }
        
        return jsonResponse;
    } catch (error) {
        console.error("Conversational AI Error:", error);
        return {
            reply: "I'm sorry, I am currently facing technical difficulties processing your query. Please try again.",
            severity: "General Guidance",
            category: "Other",
            suggestedActions: []
        };
    }
};

module.exports = {
    generateChatCompletion,
    getLegalGuidance,
    getStrictRagGuidance,
    generateDocumentSummary,
    cleanupOCRText,
    translateSummary
};
