const Law = require('../models/Law');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Matches the user's query against verified laws in the database using Gemini.
 */
const matchLaws = async (userQuery, language = 'English') => {
    try {
        const laws = await Law.find({});
        if (laws.length === 0) return [];

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
        const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: { responseMimeType: "application/json" }
        });

        // Format laws as context list for Gemini
        const lawsInput = laws.map(l => ({
            name: l.name,
            description: l.description,
            keywords: l.keywords
        }));

        const prompt = `You are an expert Indian Legal Advisor.
Analyze the user's query: "${userQuery}"

Match it against the following database of Indian laws:
${JSON.stringify(lawsInput, null, 2)}

Select the central or state laws that are directly applicable to the situation. For each matched law:
1. Identify the applicable Section (e.g., "Section 35" or "Section 66D"). If no specific section matches, use "General". Do not fabricate section numbers or acts under any circumstances.
2. Provide a 2-3 sentence short explanation in the response language: "${language}" about how this specific section/law applies to the user's scenario.

Output your answer strictly as a JSON array of objects with the following schema:
[
  {
    "lawName": "Exact name of the law from the database list",
    "relevantSection": "Applicable section number",
    "explanation": "2-3 sentence explanation"
  }
]

If no laws from the list are applicable, return an empty array []. Only select laws that are genuinely relevant. Do not write anything other than the JSON output.`;

        const result = await model.generateContent(prompt);
        let matchedList = [];
        try {
            const rawText = result.response.text();
            matchedList = JSON.parse(rawText.trim());
        } catch (e) {
            console.error("Failed to parse Gemini laws JSON response:", e);
        }

        if (!Array.isArray(matchedList)) {
            matchedList = [];
        }

        // Map verified database links and data back to selected laws
        const finalResults = [];
        for (const item of matchedList) {
            const dbLaw = laws.find(l => l.name.toLowerCase() === item.lawName.toLowerCase());
            if (dbLaw) {
                finalResults.push({
                    name: dbLaw.name,
                    section: item.relevantSection || 'General',
                    explanation: item.explanation,
                    officialLink: dbLaw.officialLink
                });
            }
        }

        return finalResults;
    } catch (err) {
        console.error("Error in matchLaws service:", err);
        return [];
    }
};

module.exports = { matchLaws };
