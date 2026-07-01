const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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

const MODELS_TO_TRY = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro',
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-flash-lite-latest'
];

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
        const systemInstruction = `You are NyayaSetu, an AI Legal Assistant for India.
CRITICAL: Every URL, website address, or link you mention MUST be strictly formatted as clickable markdown links, e.g. [Cyber Crime Portal](https://cybercrime.gov.in/) or [Women Helpline Portal](http://www.ncwhelpline.in/). Never write raw, unclickable links like "https://cybercrime.gov.in/" or "cybercrime.gov.in". Make sure the links are 100% correct official portals.
Provide ONLY the absolute necessary information. Do not include any conversational filler, introductory text, or extra context.
Use short, simple sentences and clear bullet points or step-by-step lists. It must be extremely easy for a common citizen to understand.
Respond in the language: ${language || 'English'}. Ensure the entire response (including explanation and layout headings) is returned in this language.
You MUST format your output under these exact headings and nothing else:
### Problem Understanding
(Write 1-2 short bullet points explaining the core issue)

### Relevant Law
(List only the direct applicable Acts/Sections in a bulleted list)

### Suggested Actions (Step-by-step)
(Provide a clear, detailed, and chronological step-by-step checklist of immediate practical actions the user should take. Crucially, the very first step must be the immediate action required for the specific situation. For example, if the issue is a crime or lost/stolen belongings, the first step must explicitly guide them to visit the nearest police station or use a citizen portal to file a lost report, complaint, or FIR. Adapt the sequence of steps to fit the user's specific problem.)

### Required Documents
(List only the required documents in a bulleted list)

### Authorities to Contact
(List the specific police station, court, or office to contact in a bulleted list)

### Disclaimer
(Include a short, standard 1-sentence legal disclaimer)`;
        
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
  "citizenSummary": {
    "whatThisDocumentIsAbout": "string (2 to 3 simple sentences in plain language explaining what this document is about)",
    "whoIsInvolved": "string (list of names and their roles in the document in plain language)",
    "keyFactsAndDecisions": ["string (key facts and decisions, maximum 6 short bullet points)"],
    "whatThisMeansForYou": "string (1 to 2 clear sentences explaining direct implications/consequences for the person, written in plain language)",
    "whatYouShouldDoNext": ["string (numbered action steps in plain language)"],
    "importantDatesAndDeadlines": ["string (all key deadlines, hearing dates, or dates when actions must be completed from the document)"],
    "legalTermsExplained": [
      {
        "term": "string (difficult legal term or phrase used in the document)",
        "definition": "string (simple definition of the term in plain language for a citizen)"
      }
    ],
    "risksToBeAwareOf": ["string (2 to 3 plain language warnings about risks or negative consequences in the document)"]
  },
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
    
    throw new Error(lastError?.message || "Failed to generate document summary after trying multiple models.");
};

module.exports = { getLegalGuidance, generateDocumentSummary, cleanupOCRText, translateSummary };
