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

const rewriteQuery = async (query) => {
    try {
        const groqService = require('./groqService');
        const prompt = `You are a helpful query translation assistant. Your task is to rewrite the user's conversational input into a search query suitable for semantic vector retrieval.
Remove all conversational greetings, filler, and non-essential words (e.g. "hello", "please help me", "how can I", "my name is", "helo", "hi").
Translate informal phrasing to standard legal/factual query concepts. For example:
- "my sister is lost" -> "missing person report FIR registration search procedure"
- "sister is missing" -> "missing person police complaint legal procedure"
- "daughter disappeared" -> "missing person kidnapping abduction minor"
- "cannot be found" -> "missing person complaint"

Input: "${query}"

Return ONLY the rewritten, space-separated keywords or simple factual phrase to use as a search query. Do not include any explanation, conversational filler, or intro text.`;

        const rewritten = await groqService.generateChatCompletion(prompt);
        console.log(`🔍 Query Expansion: "${query}" -> "${rewritten.trim()}"`);
        return rewritten.trim();
    } catch (err) {
        console.error("❌ Failed to rewrite query, using original:", err.message);
        return query;
    }
};

const searchRelevantDocs = async (query, documentId, rewrite = true) => {
    try {
        if (!vectorStore) {
            return [];
        }
        
        // Step 1: Rewrite query if requested
        const searchQuery = rewrite ? await rewriteQuery(query) : query;
        
        const filter = documentId ? (doc) => doc.metadata.documentId === documentId : undefined;
        
        // Step 2: Retrieve Top-K (up to 8 chunks)
        const resultsWithScore = await vectorStore.similaritySearchWithScore(searchQuery, 8, filter);
        
        // Step 3: Filter by a threshold of 1.20 (reasonably lenient to prevent false negatives)
        const THRESHOLD = 1.20;
        const filteredResultsWithScore = resultsWithScore.filter(([doc, score]) => score <= THRESHOLD);
        
        // Step 4: Debug logging of retrieval pipeline details
        console.log(`\n================ RAG RETRIEVAL PIPELINE DEBUG ===============`);
        console.log(`📥 Original Query: "${query}"`);
        console.log(`🔍 Expanded Search Query: "${searchQuery}"`);
        console.log(`📄 Total Chunks Retrieved: ${resultsWithScore.length}`);
        console.log(`🎯 Chunks Matching Threshold (<= ${THRESHOLD}): ${filteredResultsWithScore.length}`);
        console.log(`-------------------------------------------------------------`);
        resultsWithScore.forEach(([doc, score], idx) => {
            const status = score <= THRESHOLD ? "✅ PASS" : "❌ FAIL";
            console.log(`[Chunk ${idx + 1}] Score: ${score.toFixed(4)} [${status}]`);
            console.log(`Source Document: ${doc.metadata?.documentId || "System Database"}`);
            console.log(`Content Snippet: "${doc.pageContent.substring(0, 120).replace(/\n/g, " ")}..."`);
            console.log(`-------------------------------------------------------------`);
        });
        console.log(`=============================================================\n`);

        return filteredResultsWithScore.map(([doc, score]) => doc);
    } catch (error) {
        console.error("RAG Search Error:", error.message);
        throw new Error("Failed to search relevant documents");
    }
};

const askDocumentQuestion = async (documentId, query, history = []) => {
    try {
        const relevantDocs = await searchRelevantDocs(query, documentId, false);
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
