require('dotenv').config();
const { getEmbeddings } = require('./services/ragService');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');

async function run() {
    try {
        console.log("=== Testing custom OpenAIEmbeddings class ===");
        const embeddings = getEmbeddings();

        console.log("Testing embedQuery...");
        const vector = await embeddings.embedQuery("hello world");
        console.log(`✅ SUCCESS! Vector length: ${vector.length}`);

        console.log("\nTesting FaissStore.fromTexts...");
        const store = await FaissStore.fromTexts(
            ["hello world", "foo bar"],
            [{ id: 1 }, { id: 2 }],
            embeddings
        );
        console.log("✅ FaissStore created successfully!");
    } catch (e) {
        console.error("❌ FAILED:", e.message);
    }
}
run();
