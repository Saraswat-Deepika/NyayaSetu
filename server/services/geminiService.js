const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS_TO_TRY = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-2.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
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
Provide ONLY the absolute necessary information. Do not include any conversational filler, introductory text, or extra context.
Use short, simple sentences and clear bullet points or step-by-step lists. It must be extremely easy for a common citizen to understand.
Respond in the language: ${language || 'English'}. Ensure the entire response (including explanation and layout headings) is returned in this language.
You MUST format your output under these exact headings and nothing else:
### Problem Understanding
(Write 1-2 short bullet points explaining the core issue)

### Relevant Law
(List only the direct applicable Acts/Sections in a bulleted list)

### Suggested Actions (Step-by-step)
(Provide a step-by-step list of immediate actions the user should take)

### Required Documents
(List only the required documents in a bulleted list)

### Authorities to Contact
(List the specific police station, court, or office to contact in a bulleted list)

### Disclaimer
(Include a short, standard 1-sentence legal disclaimer)`;
        
        const promptConstraint = `\n\n[INSTRUCTION: Answer extremely briefly. Use only 1-2 short bullet points or a simple step-wise list under each heading. Keep the entire response under 150 words total. Do not include any introductory text, warnings, or conversational filler. Start directly with the headings. It must be very easy for a common citizen to understand.]`;
        const finalQuery = `${userQuery}${promptConstraint}`;

        let lastError;
        let responseText;

        for (const modelName of MODELS_TO_TRY) {
            try {
                console.log(`⚖️ Attempting legal guidance generation with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    systemInstruction: systemInstruction 
                });

                if (history && history.length > 0) {
                    const activeHistory = history.slice(-4);
                    const formattedHistory = activeHistory.map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    }));
                    const chat = model.startChat({
                        history: formattedHistory
                    });
                    const result = await chat.sendMessage(finalQuery);
                    responseText = result.response.text();
                } else {
                    const result = await model.generateContent(finalQuery);
                    responseText = result.response.text();
                }

                if (responseText) {
                    console.log(`✅ Legal guidance generation Succeeded using ${modelName}`);
                    break;
                }
            } catch (err) {
                console.warn(`⚠️ Generation failed with ${modelName}:`, err.message);
                lastError = err;
            }
        }

        if (!responseText) {
            throw lastError || new Error("All generative models failed");
        }

        return responseText;
    } catch (error) {
        console.error("Gemini AI Error:", error);
        throw new Error("Failed to get legal guidance.");
    }
};

const generateDocumentSummary = async (text) => {
    let lastError;
    
    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`⚖️ Attempting document summary with model: ${modelName}`);
            const model = genAI.getGenerativeModel({ 
                model: modelName
            });

            const prompt = `Please provide a concise legal summary of the following document text:\n\n${text}`;
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error(`[Gemini API] Summary failed with model ${modelName}:`, error.message);
            lastError = error;
        }
    }
    
    throw new Error(lastError?.message || "Failed to generate document summary after trying multiple models.");
};

module.exports = { getLegalGuidance, generateDocumentSummary };
