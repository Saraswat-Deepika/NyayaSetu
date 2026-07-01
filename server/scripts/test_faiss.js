require('dotenv').config({ path: '../.env' });
const { chunkText } = require('../services/rag/chunkService');
const { addDocumentsToStore } = require('../services/vector/faissService');

async function test() {
    try {
        console.log("Starting test...");
        const text = "This is a sample document text for testing the FAISS store upload.";
        const docs = await chunkText(text, "test_doc_id_1");
        console.log("Chunks created:", docs.length);
        
        await addDocumentsToStore(docs);
        console.log("Added to store successfully.");
    } catch (err) {
        console.error("Error during FAISS operations:", err);
    }
}

test();
