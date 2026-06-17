require('dotenv').config();
const { extractTextFromPDF } = require('./services/pdfService');
const { indexDocument } = require('./services/ragService');
const { generateDocumentSummary } = require('./services/geminiService');

const testFile = 'c:\\Users\\Lenovo\\NyayaSetu\\server\\uploads\\document-1781674944839.pdf';

async function run() {
    try {
        console.log("1. Starting PDF extraction...");
        const text = await extractTextFromPDF(testFile);
        console.log("Extracted text length:", text.length);
        console.log("Snippet:", text.slice(0, 300));

        console.log("\n2. Starting FAISS indexing...");
        try {
            await indexDocument(text, "dummy_id_123");
            console.log("FAISS indexing succeeded!");
        } catch (e) {
            console.error("FAISS indexing failed:", e.message);
        }

        console.log("\n3. Starting Gemini summary generation...");
        const summary = await generateDocumentSummary(text, 'English');
        console.log("Gemini summary succeeded!");
        console.log(JSON.stringify(summary, null, 2).slice(0, 500));

    } catch (e) {
        console.error("ERROR running upload steps:", e);
    }
}
run();
