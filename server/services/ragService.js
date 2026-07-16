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
        const prompt = `You are a helpful query translation assistant. Your task is to rewrite the user's conversational input into search queries suitable for semantic vector retrieval.
Remove all conversational greetings and non-essential words.
Generate exactly 4 semantic variations of the query to maximize document retrieval.
For example, if the query is "My landlord is not returning my deposit", variations could be:
1. "landlord tenant dispute"
2. "rent agreement"
3. "security deposit refund"
4. "tenancy rights"

Input: "${query}"

Output ONLY a raw JSON array of 4 strings. No markdown formatting, no conversational text.
Example: ["query 1", "query 2", "query 3", "query 4"]`;

        const rewritten = await groqService.generateChatCompletion(prompt, null, true);
        
        let parsed;
        try {
            // Strip markdown block if model added it
            const jsonText = rewritten.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(jsonText);
        } catch (e) {
            parsed = [query];
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`🔍 Multi-Query Expansion: "${query}" ->`, parsed);
            return parsed;
        }
        return [query];
    } catch (err) {
        console.error("❌ Failed to rewrite query, using original:", err.message);
        return [query];
    }
};

const searchRelevantDocs = async (query, documentId, rewrite = true) => {
    try {
        // Step 1: Rewrite query if requested (returns array)
        const searchQueries = rewrite ? await rewriteQuery(query) : [query];
        
        // Step 2: If it's a general query (no specific documentId), route to Python Global FAISS!
        if (!documentId) {
            console.log(`\n[RAG] Routing general legal query to Python Global FAISS for ${searchQueries.length} variations.`);
            try {
                let allResults = [];
                for (const sq of searchQueries) {
                    try {
                        const response = await axios.post('http://127.0.0.1:8000/api/rag/search', { query: sq, k: 20 });
                        if (response.data && response.data.success) {
                            allResults.push(...response.data.results);
                        }
                    } catch (reqErr) {
                         console.error(`[RAG] Error fetching for query "${sq}": ${reqErr.message}`);
                    }
                }
                
                // Deduplicate by text
                const uniqueResults = [];
                const seenText = new Set();
                
                for (const r of allResults) {
                    if (!seenText.has(r.text)) {
                        seenText.add(r.text);
                        uniqueResults.push(r);
                    }
                }
                
                // Sort by distance (lower is better)
                uniqueResults.sort((a, b) => a.score - b.score);
                
                // Take top 20 and filter by threshold 1.50
                const validResults = uniqueResults.slice(0, 20).filter(r => r.score <= 1.50);
                
                console.log(`[RAG] Python FAISS returned ${uniqueResults.length} unique chunks. ${validResults.length} passed threshold.`);
                
                if (validResults.length > 0) {
                    return validResults.map(r => ({ pageContent: r.text, source: r.source }));
                } else {
                    return []; // Strict RAG: don't fall back to local FAISS for general queries
                }
            } catch (pyErr) {
                console.error("[RAG] Python FAISS error (Is python app.py running?):", pyErr.message);
                return []; // Strict RAG: don't fall back to local FAISS
            }
        }
        
        // --- Code below is ONLY for specific documentId (user-uploaded PDFs) ---
        
        if (!vectorStore) {
            return [];
        }
        
        const filter = documentId ? (doc) => doc.metadata.documentId === documentId : undefined;
        
        // Step 3: Retrieve Top-K from local Langchain FAISS (up to 8 chunks)
        const fallbackQuery = searchQueries[0];
        const resultsWithScore = await vectorStore.similaritySearchWithScore(fallbackQuery, 8, filter);
        
        // Step 3: Filter by a threshold of 1.20 (reasonably lenient to prevent false negatives)
        const THRESHOLD = 1.20;
        const filteredResultsWithScore = resultsWithScore.filter(([doc, score]) => score <= THRESHOLD);
        
        // Step 4: Debug logging of retrieval pipeline details
        console.log(`\n================ RAG RETRIEVAL PIPELINE DEBUG ===============`);
        console.log(`📥 Original Query: "${query}"`);
        console.log(`🔍 Fallback Search Query: "${fallbackQuery}"`);
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
