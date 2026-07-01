const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { getEmbeddingsModel } = require('../../config/gemini');
const { VECTOR_STORE_PATH } = require('../../config/faiss');
const fs = require('fs');

let vectorStore = null;

const initVectorStore = async () => {
    if (vectorStore) return vectorStore;
    
    try {
        if (fs.existsSync(VECTOR_STORE_PATH)) {
            vectorStore = await FaissStore.load(VECTOR_STORE_PATH, getEmbeddingsModel());
            console.log("Loaded existing FAISS vector store.");
        }
    } catch (error) {
        console.warn("Could not load FAISS store, it will be created on next index:", error.message);
    }
    return vectorStore;
};

const getVectorStore = async () => {
    if (!vectorStore) await initVectorStore();
    return vectorStore;
};

const addDocumentsToStore = async (docs) => {
    const store = await getVectorStore();
    const embeddings = getEmbeddingsModel();

    if (!store) {
        vectorStore = await FaissStore.fromDocuments(docs, embeddings);
    } else {
        await vectorStore.addDocuments(docs);
    }
    
    await vectorStore.save(VECTOR_STORE_PATH);
};

const searchStore = async (query, k = 4, filter = undefined) => {
    const store = await getVectorStore();
    if (!store) return [];
    return await store.similaritySearch(query, k, filter);
};

// Initialize immediately
initVectorStore();

module.exports = {
    initVectorStore,
    getVectorStore,
    addDocumentsToStore,
    searchStore
};
