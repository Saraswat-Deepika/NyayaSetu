require('dotenv').config();
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');

async function testEmbeddingModel(modelName) {
    try {
        console.log(`=== Testing model: ${modelName} ===`);
        const embeddings = new GoogleGenerativeAIEmbeddings({
            modelName: modelName,
            apiKey: process.env.GEMINI_API_KEY
        });

        console.log("Testing embedQuery...");
        const vector = await embeddings.embedQuery("hello world");
        console.log(`✅ SUCCESS! Vector length: ${vector.length}`);
        return embeddings;
    } catch (e) {
        console.error(`❌ FAILED with model ${modelName}:`, e.message);
        return null;
    }
}

async function run() {
    let activeEmbeddings = await testEmbeddingModel("text-embedding-04");
    if (!activeEmbeddings) {
        activeEmbeddings = await testEmbeddingModel("gemini-embedding-001");
    }

    if (activeEmbeddings) {
        try {
            console.log("\nTesting FaissStore.fromTexts...");
            const store = await FaissStore.fromTexts(
                ["hello world", "foo bar"],
                [{ id: 1 }, { id: 2 }],
                activeEmbeddings
            );
            console.log("✅ FaissStore created successfully!");
        } catch (e) {
            console.error("❌ FaissStore creation failed:", e.message);
        }
    }
}
run();
