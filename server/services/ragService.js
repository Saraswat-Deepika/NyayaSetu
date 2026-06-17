const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const fs = require('fs');
const path = require('path');

let vectorStore = null;
const VECTOR_STORE_PATH = path.join(__dirname, '../faiss_store');

const getEmbeddings = () => {
    return new GoogleGenerativeAIEmbeddings({
        modelName: "gemini-embedding-001",
        apiKey: process.env.GEMINI_API_KEY
    });
};

const initVectorStore = async () => {
    if (vectorStore) return;
    
    try {
        if (fs.existsSync(VECTOR_STORE_PATH)) {
            vectorStore = await FaissStore.load(VECTOR_STORE_PATH, getEmbeddings());
            console.log("Loaded existing FAISS vector store.");
        }
    } catch (error) {
        console.warn("Could not load FAISS store, it will be created on next index:", error.message);
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

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const historyPrompt = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join("\n");

        const prompt = `You are a helpful legal assistant. Answer the user's question using ONLY the provided document context below.
If the answer is not in the context, politely say "I cannot answer this based on the uploaded document." Do not hallucinate outside information.

Context from Document:
${contextText}

Conversation History:
${historyPrompt}

User Question: ${query}
Assistant Answer:`;

        const result = await model.generateContent(prompt);
        return {
            answer: result.response.text(),
            citations
        };
    } catch (error) {
        console.error("RAG Chat Error:", error);
        throw new Error("Failed to get answer from document");
    }
};

module.exports = { indexDocument, searchRelevantDocs, askDocumentQuestion };
