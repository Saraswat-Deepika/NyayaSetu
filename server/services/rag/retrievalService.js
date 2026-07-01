const { searchStore } = require('../vector/faissService');

const searchRelevantDocs = async (query, documentId) => {
    try {
        const filter = documentId ? (doc) => doc.metadata.documentId === documentId : undefined;
        const results = await searchStore(query, 4, filter);
        return results;
    } catch (error) {
        console.error("RAG Search Error:", error.message);
        throw new Error("Failed to search relevant documents");
    }
};

module.exports = { searchRelevantDocs };
