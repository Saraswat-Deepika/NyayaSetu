const { GoogleGenerativeAI } = require('@google/generative-ai');
const BanditStat = require('../models/BanditStat');
const QueryFeedback = require('../models/QueryFeedback');
const Case = require('../models/Case');
const ChatSession = require('../models/ChatSession');
const { searchRelevantDocs } = require('./ragService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CATEGORIES = ['Property Law', 'Criminal Law', 'Consumer Rights', 'Family Law', 'Employment Law'];
const ARMS = ['RAG', 'GeminiLLM', 'LegalTemplate', 'SimilarCase'];
const EXPLORATION_CONSTANT = 1.0;

const MODELS_TO_TRY = [
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-flash-latest'
];

/**
 * Generates content using a list of fallback models.
 */
const generateContentWithFallback = async (prompt, systemInstruction = undefined) => {
    let lastError = null;
    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`🤖 Attempting content generation with model: ${modelName}`);
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                ...(systemInstruction ? { systemInstruction } : {})
            }, { timeout: 15000 });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            if (text) {
                console.log(`✅ Generation Succeeded using ${modelName}`);
                return text;
            }
        } catch (err) {
            console.warn(`⚠️ Generation failed with ${modelName}:`, err.message);
            lastError = err;
        }
    }
    throw lastError || new Error("All generative models failed");
};

// High quality predefined legal templates
const LEGAL_TEMPLATES = {
    'Property Law': `### Legal Template: Notice to Vacate / Eviction Response
**Notice Reference:** PL/EV-TEMP/001
**Date:** [Insert Date]

**To,**
[Landlord/Owner's Name]
[Address]

**Subject: Reply to Eviction Threat / Request for Proper Notice Period**

Sir/Madam,
I am writing in response to your verbal/written demand to vacate the flat/property located at [Your Rental Address]. 

Under **Section 106 of the Transfer of Property Act, 1882**, any lease of immovable property for residential purposes requires a minimum notice period of **15 days** (or 30 days if specified in the rent agreement) before eviction can be requested.

Please note that attempting to evict a tenant without a registered notice or legal procedure is non-compliant with standard tenant protection laws. 

I request you to:
1. Provide a formal, written notice period as per our Rent Agreement.
2. Accept the rent amount for the current period against a valid receipt.

Sincerely,
**[Your Name / Tenant]**`,

    'Criminal Law': `### Legal Template: Draft Police Complaint for Theft/Cyber Fraud
**Reference:** CL/COMP-TEMP/002
**Date:** [Insert Date]

**To,**
The Officer-in-Charge,
[Name of Police Station / Cyber Crime Cell]
[City, State]

**Subject: Complaint against Unauthorized Access / Theft / Cyber Fraud**

Respected Sir/Madam,
I wish to lodge a formal complaint regarding an incident of [describe briefly, e.g., credit card fraud, theft of mobile] which took place on [Date] at approximately [Time] at [Location/Online URL].

**Details of the Incident:**
1. **Complainant Name:** [Your Name]
2. **Contact Info:** [Your Phone Number]
3. **Suspected Person/Number:** [Suspected Person details, if known]
4. **Description of loss/incident:** [Detailed timeline and description]

Under the **Indian Penal Code (IPC) / Bharatiya Nyaya Sanhita (BNS)** and **Information Technology Act, 2000 (Section 66D)**, this action constitutes a punishable offense. I request you to register a First Information Report (FIR) and initiate investigation.

Yours faithfully,
**[Your Name]**`,

    'Consumer Rights': `### Legal Template: Legal Notice for Defective Product / Service Deficiency
**Reference:** CR/NOT-TEMP/003
**Date:** [Insert Date]

**To,**
[Company/Seller's Name]
[Registered Office Address]

**Subject: Legal Notice regarding Deficiency of Service / Defective Product**

Under instructions from my client [Your Name], residing at [Your Address], I hereby serve you with this notice:
1. That on [Date], my client purchased [Product/Service Name] from your outlet/online portal vide Invoice No: [Invoice Number] for a consideration of Rs. [Amount].
2. The product/service was found defective / deficient due to: [describe defect, e.g. laptop not turning on, warranty service denied].
3. My client contacted your support team multiple times but received no response.

Therefore, you are hereby requested to either **replace the product** or **refund the full amount** of Rs. [Amount] within **15 days** of receipt of this notice, failing which we shall file a formal complaint in the Consumer Forum.

**[Sender Name / Advocate]**`,

    'Family Law': `### Legal Template: Outline Petition for Mutual Consent Divorce / Maintenance Request
**Reference:** FL/PET-TEMP/004
**Date:** [Insert Date]

**In the Court of the Principal Judge, Family Court,**
[District/City]

**Subject: Information required for Petition for Dissolution of Marriage by Mutual Consent**

Under **Section 13B of the Hindu Marriage Act, 1955**, spouses filing for divorce by mutual consent must specify:
1. **Separation Period:** That both parties have been living separately for a period of one year or more.
2. **Mutual Consent:** That they have mutually agreed that the marriage should be dissolved.
3. **Settlement Terms:**
   - Permanent Alimony / Maintenance settled at Rs. [Amount].
   - Custody of children (if applicable) agreed to be with [Mother/Father].
   - Division of joint assets/stridhan.

*Note: Spouses must attend joint counseling sessions at the family court after filing the first motion, followed by a 6-month statutory waiting period.*

**Drafted by:**
[Your Name / Legal counsel]`,

    'Employment Law': `### Legal Template: Demand Notice for Unpaid Salary / Wrongful Termination Reply
**Reference:** EL/NOT-TEMP/005
**Date:** [Insert Date]

**To,**
The Managing Director / HR Department,
[Company Name]
[Address]

**Subject: Demand Notice for Recovery of Outstanding Dues and Unpaid Salary**

Sir/Madam,
I am writing to formally request the payment of my outstanding salary and dues. I was employed as [Your Designation] from [Start Date] to [End Date], when my services were terminated without proper notice.

As of today, the following dues remain unpaid:
1. **Unpaid Salary** for the months of [Insert months]: Rs. [Amount]
2. **Leave Encashment** and gratuity: Rs. [Amount]
3. **Severance Pay** (as per appointment letter): Rs. [Amount]

Under **Section 3 of the Payment of Wages Act, 1936**, every employer is responsible for the payment of wages. You are requested to release my dues within **10 days** of receipt of this notice, failing which I shall be constrained to initiate legal proceedings in the Labor Court.

Sincerely,
**[Your Name]**`
};

/**
 * Classifies a user query into one of the 5 legal categories using Gemini.
 */
const classifyCategory = async (query) => {
    if (process.env.MOCK_AI === 'true') {
        const q = query.toLowerCase();
        let cat = 'Criminal Law'; // default
        if (q.includes('rent') || q.includes('flat') || q.includes('tenant') || q.includes('landlord') || q.includes('evict') || q.includes('property') || q.includes('vacate')) {
            cat = 'Property Law';
        } else if (q.includes('theft') || q.includes('stolen') || q.includes('chori') || q.includes('cyber') || q.includes('fraud') || q.includes('police') || q.includes('fir')) {
            cat = 'Criminal Law';
        } else if (q.includes('defective') || q.includes('defect') || q.includes('refund') || q.includes('product') || q.includes('seller') || q.includes('consumer')) {
            cat = 'Consumer Rights';
        } else if (q.includes('divorce') || q.includes('family') || q.includes('marriage') || q.includes('husband') || q.includes('wife') || q.includes('maintenance')) {
            cat = 'Family Law';
        } else if (q.includes('salary') || q.includes('unpaid') || q.includes('job') || q.includes('termination') || q.includes('harassment') || q.includes('advocate') || q.includes('wage')) {
            cat = 'Employment Law';
        }
        console.log(`🧪 [MOCK MODE] Classified category: "${cat}"`);
        return cat;
    }

    try {
        console.log(`🔍 Classifying query category: "${query.substring(0, 50)}..."`);
        const systemPrompt = `You are a legal classifier. You MUST classify the following user legal query into exactly one of these 5 categories:
1. Property Law (landlord tenant, rent, property sale, trespassing, eviction)
2. Criminal Law (theft, fraud, murder, threat, physical injury, cyber crime, cheating)
3. Consumer Rights (defective products, service deficiency, refunds, fraud sellers)
4. Family Law (divorce, custody, maintenance, domestic dispute, inheritance)
5. Employment Law (unpaid salary, termination, harassment, work contract)

Reply with ONLY the exact category name from the list, nothing else. If it does not fit, classify it to the closest match.`;

        const classification = (await generateContentWithFallback(`${systemPrompt}\n\nQuery: ${query}`)).trim();
        
        // Find the category in the predefined list
        const matchedCategory = CATEGORIES.find(c => classification.toLowerCase().includes(c.toLowerCase()));
        if (matchedCategory) {
            console.log(`🎯 Query classified as: ${matchedCategory}`);
            return matchedCategory;
        }
        
        console.log(`⚠️ Unmatched classification: "${classification}". Defaulting to Criminal Law.`);
        return 'Criminal Law'; // Reasonable default
    } catch (err) {
        console.error("❌ Classification failed, defaulting to Property Law:", err.message);
        return 'Property Law';
    }
};

/**
 * Initializes statistics in MongoDB for any missing arms in a category.
 */
const initializeStatsIfMissing = async (category) => {
    for (const arm of ARMS) {
        await BanditStat.findOneAndUpdate(
            { category, armName: arm },
            { $setOnInsert: { totalSelections: 0, totalReward: 0, averageReward: 0.0 } },
            { upsert: true, new: true }
        );
    }
};

/**
 * Implements UCB1 selection math.
 * Selects the arm with the highest UCB score.
 */
const getBestStrategy = async (category) => {
    try {
        await initializeStatsIfMissing(category);

        const stats = await BanditStat.find({ category });
        
        // Compute total selections N for the category
        const N = stats.reduce((acc, stat) => acc + stat.totalSelections, 0);
        
        let selectedArm = null;
        let highestScore = -Infinity;
        const ucbDetails = {};

        for (const stat of stats) {
            let score;
            if (stat.totalSelections === 0) {
                // Explore first: assign infinity score if never selected
                score = Infinity;
            } else {
                // UCB1 formula: averageReward + c * sqrt(ln(N) / n_i)
                const exploitation = stat.averageReward;
                const exploration = EXPLORATION_CONSTANT * Math.sqrt(Math.log(N) / stat.totalSelections);
                score = exploitation + exploration;
            }
            
            ucbDetails[stat.armName] = {
                selections: stat.totalSelections,
                averageReward: stat.averageReward,
                ucbScore: score
            };

            if (score > highestScore) {
                highestScore = score;
                selectedArm = stat.armName;
            }
        }

        console.log(`[MAB SELECT] Selected strategy "${selectedArm}" for Category "${category}"`);
        return { selectedArm, confidence: highestScore === Infinity ? 0.99 : highestScore };
    } catch (err) {
        console.error("❌ Failed to get best strategy, defaulting to GeminiLLM:", err.message);
        return { selectedArm: 'GeminiLLM', confidence: 0.8 };
    }
};

/**
 * Increments the totalSelections count for an arm.
 */
const incrementSelection = async (category, armName) => {
    try {
        await BanditStat.updateOne(
            { category, armName },
            { $inc: { totalSelections: 1 } }
        );
        console.log(`📈 Incremented selections for ${category} -> ${armName}`);
    } catch (err) {
        console.error("❌ Failed to increment selection count:", err.message);
    }
};

/**
 * Handles RAG search and passes results as context to Gemini.
 */
const executeRAGStrategy = async (query, language) => {
    if (process.env.MOCK_AI === 'true') {
        console.log('🧪 [MOCK RAG] Generating mock RAG response');
        return `### Problem Understanding
Based on the retrieved legal documents, you need to report the incident and protect your legal rights.

### Relevant Law
- **Indian Penal Code (IPC) Section 379 / BNS Section 303(2)**

### Suggested Actions (Step-by-step)
1. Draft a formal report as referenced in [Document 1].
2. File it at the nearest police station or cyber portal.

### Required Documents
- Invoice or purchase bill
- ID Proof

### Authorities to Contact
- Nearby Police Station

### Disclaimer
This is a mock RAG response for testing.`;
    }

    const docs = await searchRelevantDocs(query);
    if (!docs || docs.length === 0) {
        console.log("ℹ️ No relevant RAG documents found. Falling back to direct LLM answer.");
        return null; // Return null so caller falls back to direct LLM
    }

    const context = docs.map((d, i) => `[Document ${i + 1}]:\n${d.pageContent}`).join('\n\n');
    const systemPrompt = `You are NyayaSetu, an AI Legal Assistant for India.
CRITICAL: Every URL, website address, or link you mention MUST be strictly formatted as clickable markdown links, e.g. [Cyber Crime Portal](https://cybercrime.gov.in/) or [Women Helpline Portal](http://www.ncwhelpline.in/). Never write raw, unclickable links like "https://cybercrime.gov.in/" or "cybercrime.gov.in". Make sure the links are 100% correct official portals.
You must answer the user's legal question strictly based on the provided document context.
If the context does not contain enough information, provide standard legal information while mentioning you did not find direct document matches.

Format your output under these exact headings and nothing else:
### Problem Understanding
### Relevant Law
### Suggested Actions (Step-by-step)
(Provide a clear, detailed, and chronological step-by-step checklist of immediate practical actions, showing exactly what to do first, second, etc., tailored to the user's specific problem. If the problem is lost/stolen belongings or a crime, the very first step must guide them to go to the nearest police station or use a citizen portal to file a lost report/FIR. Do not be overly brief; ensure it is completely actionable.)
### Required Documents
### Authorities to Contact
### Disclaimer (Include a standard legal disclaimer)

Respond in the language: ${language || 'English'}.`;

    return await generateContentWithFallback(`Context:\n${context}\n\nQuestion: ${query}`, systemPrompt);
};

/**
 * Retrieves past similar cases of the same category.
 */
const executeSimilarCaseStrategy = async (query, category, language) => {
    if (process.env.MOCK_AI === 'true') {
        console.log('🧪 [MOCK SIMILAR CASE] Generating mock similar case response');
        return `### Problem Understanding
We analyzed past resolved cases of category ${category}. In similar situations, users successfully recovered stolen items or settled disputes.

### Relevant Law
- **Indian Penal Code (IPC) Section 379** (Theft cases)
- **Transfer of Property Act, 1882 Section 106** (Rent cases)

### Suggested Actions (Step-by-step)
1. Register a complaint/FIR immediately at the local police station.
2. In similar case #1, police tracked the device using IP/serial numbers.
3. Keep all documentation ready for investigation.

### Required Documents
- Copy of the complaint/FIR
- ID Proof and product bill

### Authorities to Contact
- local Police Station / Rent Controller

### Disclaimer
This is a mock response comparing past similar cases.`;
    }

    // Retrieve up to 2 resolved cases in MongoDB of same category
    const similarCases = await Case.find({ category, aiSummary: { $exists: true } })
        .limit(2)
        .select('title description aiSummary');

    if (!similarCases || similarCases.length === 0) {
        console.log("ℹ️ No similar cases found in DB. Falling back to direct LLM.");
        return null;
    }

    const caseContext = similarCases.map((c, i) => `Case ${i+1}: ${c.title}\nDescription: ${c.description}\nAI Analysis: ${c.aiSummary}`).join('\n\n');

    const systemPrompt = `You are NyayaSetu, an AI Legal Assistant for India.
CRITICAL: Every URL, website address, or link you mention MUST be strictly formatted as clickable markdown links, e.g. [Cyber Crime Portal](https://cybercrime.gov.in/) or [Women Helpline Portal](http://www.ncwhelpline.in/). Never write raw, unclickable links like "https://cybercrime.gov.in/" or "cybercrime.gov.in". Make sure the links are 100% correct official portals.
Provide legal guidance on the user's situation by drawing comparison/reference from these past cases we processed:
${caseContext}

Highlight how their situation is similar or different, and what standard steps should be taken.
Format your output under these exact headings and nothing else:
### Problem Understanding
### Relevant Law
### Suggested Actions (Step-by-step)
(Provide a clear, detailed, and chronological step-by-step checklist of immediate practical actions, showing exactly what to do first, second, etc., tailored to the user's specific problem. If the problem is lost/stolen belongings or a crime, the very first step must guide them to go to the nearest police station or use a citizen portal to file a lost report/FIR. Do not be overly brief; ensure it is completely actionable.)
### Required Documents
### Authorities to Contact
### Disclaimer (Include a standard legal disclaimer)

Respond in the language: ${language || 'English'}.`;

    return await generateContentWithFallback(`User Query: ${query}`, systemPrompt);
};

/**
 * Customizes a legal template for the user query using Gemini.
 */
const executeLegalTemplateStrategy = async (query, category, language) => {
    const template = LEGAL_TEMPLATES[category];
    if (!template) {
        console.log(`ℹ️ No legal template found for category ${category}. Falling back to direct LLM.`);
        return null;
    }

    if (process.env.MOCK_AI === 'true') {
        console.log('🧪 [MOCK LEGAL TEMPLATE] Generating mock legal template response');
        let customized = template
            .replace(/\[Insert Date\]/g, new Date().toLocaleDateString())
            .replace(/\[Your Name\]/g, 'Deepika Saraswat')
            .replace(/\[Your Phone Number\]/g, '9876543210')
            .replace(/\[Location\/Online URL\]/g, 'Noida Metro Station')
            .replace(/\[describe briefly, e.g., credit card fraud, theft of mobile\]/g, 'Theft of Laptop (HP Pavilion)')
            .replace(/\[Detailed timeline and description\]/g, 'My laptop was stolen from my bag while I was traveling on the Metro.');

        return `### Problem Understanding
You need to file a complaint for a stolen item or legal dispute and require a customized template.

### Relevant Law
- **Indian Penal Code (IPC) Section 379**
- **Transfer of Property Act, 1882 Section 106**

### Suggested Actions (Step-by-step)
1. Use the customized template draft below to file your complaint.
2. File the complaint with the local police or concerned authority.

Here is your customized complaint draft:
\`\`\`text
${customized}
\`\`\`

### Required Documents
- Original Bill showing Serial Number / Rent Agreement
- ID Proof

### Authorities to Contact
- Local Police Station / concerned department

### Disclaimer
This is a customized template mock response for testing.`;
    }

    const systemPrompt = `You are NyayaSetu, an AI Legal Assistant for India.
CRITICAL: Every URL, website address, or link you mention MUST be strictly formatted as clickable markdown links, e.g. [Cyber Crime Portal](https://cybercrime.gov.in/) or [Women Helpline Portal](http://www.ncwhelpline.in/). Never write raw, unclickable links like "https://cybercrime.gov.in/" or "cybercrime.gov.in". Make sure the links are 100% correct official portals.
You must answer the user's legal question contextually, and also customize the following legal template for their specific situation:
---
${template}
---

Instructions:
1. Answer the user's specific legal question contextually.
2. Fill out or customize the template with any relevant information from the query (like dates, items, names). For details not present, leave them as placeholder text.
3. You MUST format your output under these exact headings and nothing else:
### Problem Understanding
### Relevant Law
### Suggested Actions (Step-by-step)
(Provide a clear, detailed, and chronological step-by-step checklist of immediate practical actions, showing exactly what to do first, second, etc., tailored to the user's specific problem. If the problem is lost/stolen belongings or a crime, the very first step must guide them to go to the nearest police station or use a citizen portal to file a lost report/FIR. Integrate the customized template text directly under this heading so the user can copy it easily.)
### Required Documents
### Authorities to Contact
### Disclaimer (Include a standard legal disclaimer)

4. Integrate the customized template text directly under "### Suggested Actions (Step-by-step)" so the user can copy it easily.
5. Respond in the language: ${language || 'English'}. Ensure the entire response (including explanation and layout headings) is returned in this language.`;

    return await generateContentWithFallback(`User Query: ${query}`, systemPrompt);
};

/**
 * Handles the generation flow for the selected strategy.
 */
const generateAnswerByStrategy = async (strategy, query, category, history, language) => {
    console.log(`🏗️ Generating answer using strategy: ${strategy}`);
    
    let answerText = null;

    try {
        if (strategy === 'RAG') {
            answerText = await executeRAGStrategy(query, language);
        } else if (strategy === 'LegalTemplate') {
            answerText = await executeLegalTemplateStrategy(query, category, language);
        } else if (strategy === 'SimilarCase') {
            answerText = await executeSimilarCaseStrategy(query, category, language);
        }

        // If strategy-specific generator returned null or failed, fall back to direct Gemini LLM Answer
        if (!answerText) {
            console.log("🔄 Using fallback: Gemini LLM direct generation");
            if (process.env.MOCK_AI === 'true') {
                return `### Problem Understanding
You are facing a legal query of category ${category}.

### Relevant Law
- Applicable central/state acts.

### Suggested Actions (Step-by-step)
1. Consult a legal expert.
2. Gather all relevant evidence.

### Required Documents
- ID proof
- Supporting contracts/bills

### Authorities to Contact
- Concerned local authority

### Disclaimer
This is a fallback mock response for testing.`;
            }
            // Standard system instruction from legalController
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
(Provide a clear, detailed, and chronological step-by-step checklist of immediate practical actions the user should take. Crucially, the very first step must be the immediate action required for the specific situation. For example, if the issue is a crime or lost/stolen belongings, the first step must explicitly guide them to visit the nearest police station or use a citizen portal to file a lost report, complaint, or FIR. Adapt the sequence of steps to fit the user's specific problem.)

### Required Documents
(List only the required documents in a bulleted list)

### Authorities to Contact
(List the specific police station, court, or office to contact in a bulleted list)

### Disclaimer
(Include a short, standard 1-sentence legal disclaimer)`;

            const promptConstraint = `\n\n[INSTRUCTION: Answer clearly and concisely. Under the 'Suggested Actions (Step-by-step)' heading, provide a complete, logical step-by-step list of actions, showing exactly what to do first, second, etc., tailored to the user's specific problem. Keep the entire response under 300 words total. Do not include any introductory text, warnings, or conversational filler. Start directly with the headings. It must be very easy for a common citizen to understand.]`;

            answerText = await generateContentWithFallback(`${query}${promptConstraint}`, systemInstruction);
        }

        return answerText;
    } catch (err) {
        console.error(`❌ Strategy ${strategy} failed:`, err.message);
        throw err;
    }
};

/**
 * Updates stats in MongoDB when a user provides feedback.
 */
const recordFeedback = async (queryId, feedbackType) => {
    try {
        const value = feedbackType === 'helpful' ? 1 : 0;
        
        // Find the case to get its category and strategy
        const caseRecord = await Case.findById(queryId);
        if (!caseRecord) {
            throw new Error("Case/Query not found");
        }

        const { category, selectedStrategy } = caseRecord;
        if (selectedStrategy === 'None') {
            console.log("ℹ️ No strategy recorded for this case, skipping bandit updates.");
            return;
        }

        // Save feedback in collection
        const feedbackRecord = new QueryFeedback({
            queryId,
            category,
            strategy: selectedStrategy,
            feedback: feedbackType
        });
        await feedbackRecord.save();

        // Update Case feedback Status
        caseRecord.feedbackStatus = feedbackType;
        await caseRecord.save();

        // Update feedback in ChatSession if applicable
        await ChatSession.updateOne(
            { "messages.queryId": queryId },
            { $set: { "messages.$.feedback": feedbackType } }
        );

        // Update BanditStat
        const stat = await BanditStat.findOne({ category, armName: selectedStrategy });
        if (stat) {
            stat.totalReward += value;
            // Recompute average
            stat.averageReward = stat.totalReward / stat.totalSelections;
            await stat.save();
            console.log(`[MAB REWARD UPDATE] Case: ${queryId}, Category: "${category}", Strategy: ${selectedStrategy}, Feedback: ${feedbackType}, Reward Value: ${value}`);
            
            // Retrieve and log the updated average rewards and selection counts for all arms in that category
            const allStats = await BanditStat.find({ category });
            const performanceStr = allStats.map(s => `${s.armName}: AvgReward=${s.averageReward.toFixed(2)} (Sels=${s.totalSelections})`).join(' | ');
            console.log(`[MAB CATEGORY PERFORMANCE] Category: "${category}" -> ${performanceStr}`);
        }
    } catch (err) {
        console.error("❌ Failed to record feedback:", err.message);
        throw err;
    }
};

/**
 * Checks if the user's query is a legal, civic, or rights-related question in India.
 */
const isLegalQuery = async (query) => {
    // Simple heuristic check first to save API calls for very common conversational words
    const lowerQuery = query.toLowerCase().trim();
    if (['hello', 'hi', 'hey', 'namaste', 'pranam'].includes(lowerQuery)) {
        return false;
    }

    try {
        console.log(`🔍 Checking if query is legal-related: "${query.substring(0, 50)}..."`);
        const systemPrompt = `You are a legal filter assistant for NyayaSetu. Your task is to analyze if the user's query is related to law, rights, police, court, legal templates, government processes, or civic issues in India.
If the query is a general conversation (like "hello", "hi", "how are you"), personal identity questions (like "who am I", "me kon hu"), general knowledge/opinion unrelated to law (like "where should I go for travel", "kha jaun ghumne", "what is the weather"), or completely off-topic, reply with 'no'.
Otherwise (if it relates to crimes, disputes, property, consumer rights, family disputes, employment issues, or any other legal/civic process), reply with 'yes'.
Reply with ONLY the word 'yes' or 'no', nothing else.`;

        const response = await generateContentWithFallback(`${systemPrompt}\n\nQuery: ${query}`);
        const result = response.toLowerCase().trim();
        return result.includes('yes');
    } catch (err) {
        console.error("❌ Legal query check failed, assuming yes:", err.message);
        return true; // Default to true on error to not block users
    }
};

module.exports = {
    classifyCategory,
    getBestStrategy,
    incrementSelection,
    generateAnswerByStrategy,
    recordFeedback,
    isLegalQuery
};
