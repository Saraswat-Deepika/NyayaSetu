const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { Embeddings } = require('@langchain/core/embeddings');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const axios = require('axios');

class LocalTransformersEmbeddings extends Embeddings {
    constructor(fields) {
        super(fields ?? {});
        this.modelName = fields?.modelName || "Xenova/all-MiniLM-L6-v2";
        this.pipelinePromise = null;
    }

    async getPipeline() {
        if (!this.pipelinePromise) {
            this.pipelinePromise = (async () => {
                const { pipeline } = await import('@xenova/transformers');
                return await pipeline("feature-extraction", this.modelName);
            })();
        }
        return this.pipelinePromise;
    }

    async embedDocuments(documents) {
        try {
            const extractor = await this.getPipeline();
            const results = [];
            for (const doc of documents) {
                const output = await extractor(doc, { pooling: "mean", normalize: true });
                results.push(Array.from(output.data));
            }
            return results;
        } catch (error) {
            console.error("Local Transformers Embeddings error for documents:", error.message);
            throw error;
        }
    }

    async embedQuery(text) {
        try {
            const extractor = await this.getPipeline();
            const output = await extractor(text, { pooling: "mean", normalize: true });
            return Array.from(output.data);
        } catch (error) {
            console.error("Local Transformers Embeddings error for query:", error.message);
            throw error;
        }
    }
}

const fs = require('fs');
const path = require('path');

let vectorStore = null;
const VECTOR_STORE_PATH = path.join(__dirname, '../faiss_store');

const getEmbeddings = () => {
    return new LocalTransformersEmbeddings();
};

const initVectorStore = async () => {
    if (vectorStore) return;
    
    try {
        if (fs.existsSync(VECTOR_STORE_PATH)) {
            const loadedStore = await FaissStore.load(VECTOR_STORE_PATH, getEmbeddings());
            // Test query to verify vector dimension compatibility
            await loadedStore.similaritySearch("test query", 1);
            vectorStore = loadedStore;
            console.log("Loaded existing FAISS vector store.");
        }
    } catch (error) {
        console.warn("Could not load FAISS store (possibly due to embedding model/dimension change). Rebuilding index from MongoDB...", error.message);
        try {
            if (fs.existsSync(VECTOR_STORE_PATH)) {
                fs.rmSync(VECTOR_STORE_PATH, { recursive: true, force: true });
            }
            
            const Document = require('../models/Document');
            const docs = await Document.find({ extractedText: { $exists: true, $ne: "" } });
            if (docs.length > 0) {
                console.log(`Rebuilding FAISS index for ${docs.length} documents...`);
                const splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: 1000,
                    chunkOverlap: 200,
                    separators: ["\n\n", "\n", ".", " ", ""],
                });
                
                let allChunks = [];
                for (const doc of docs) {
                    const chunked = await splitter.createDocuments([doc.extractedText], [{ documentId: doc._id.toString() }]);
                    allChunks.push(...chunked);
                }
                
                if (allChunks.length > 0) {
                    vectorStore = await FaissStore.fromDocuments(allChunks, getEmbeddings());
                    await vectorStore.save(VECTOR_STORE_PATH);
                    console.log("✅ Successfully rebuilt FAISS vector store.");
                }
            } else {
                console.log("No documents to index. Vector store remains empty.");
            }
        } catch (rebuildError) {
            console.error("❌ Failed to rebuild FAISS store:", rebuildError.message);
        }
    }
};

// Initialize immediately
initVectorStore();

const indexDocument = async (text, documentId) => {
    try {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
            separators: ["\n\n", "\n", ".", " ", ""], // Prioritize paragraphs and sentences
        });

        const docs = await splitter.createDocuments([text], [{ documentId }]);
        const embeddings = getEmbeddings();

        if (!vectorStore) {
            vectorStore = await FaissStore.fromDocuments(docs, embeddings);
        } else {
            await vectorStore.addDocuments(docs);
        }
        
        // Persist to disk
        await vectorStore.save(VECTOR_STORE_PATH);
        
        return true;
    } catch (error) {
        console.error("RAG Indexing Error:", error.message);
        throw new Error("Failed to index document");
    }
};

const searchRelevantDocs = async (query, documentId) => {
    try {
        if (!vectorStore) {
            return [];
        }
        const filter = documentId ? (doc) => doc.metadata.documentId === documentId : undefined;
        // LangChain FAISS memory doesn't strictly support custom filtering in standard similaritySearch this easily without metadata filtering object.
        // The faiss-node wrapper supports filter function
        const results = await vectorStore.similaritySearch(query, 4, filter);
        return results;
    } catch (error) {
        console.error("RAG Search Error:", error.message);
        throw new Error("Failed to search relevant documents");
    }
};

const askDocumentQuestion = async (documentId, query, history = []) => {
    try {
        const relevantDocs = await searchRelevantDocs(query, documentId);
        const contextText = relevantDocs.map((doc, idx) => `[Source ${idx + 1}]: ${doc.pageContent}`).join("\n\n");
        const citations = relevantDocs.map(doc => ({ text: doc.pageContent }));

        const groqService = require('./groqService');

        const historyPrompt = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join("\n");

        const prompt = `You are a friendly legal assistant helping a common citizen. Answer the user's question using ONLY the provided document context below.
Answer in extremely simple, direct, and helpful language. Avoid formal legal jargon and references like "according to Section X" or "as per Clause Y". Explain the rules like a helpful neighbor would.
If the answer is not in the context, politely say "I cannot find this information in the uploaded document." Do not hallucinate outside information.

Context from Document:
${contextText}

Conversation History:
${historyPrompt}

User Question: ${query}
Assistant Answer:`;

        const answer = await groqService.generateChatCompletion(prompt);
        return {
            answer,
            citations
        };
    } catch (error) {
        console.error("RAG Chat Error:", error);
        throw new Error("Failed to get answer from document");
    }
};

module.exports = { indexDocument, searchRelevantDocs, askDocumentQuestion, getEmbeddings };
