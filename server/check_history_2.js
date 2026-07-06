const mongoose = require('mongoose');
const Document = require('./models/Document');
const DocumentHistory = require('./models/DocumentHistory');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nyayasetu');
        console.log("Connected to DB.");

        const latestDoc = await Document.findOne().sort({ createdAt: -1 });
        if (!latestDoc) {
            console.log("No documents found in Document collection!");
            return;
        }

        console.log("Latest document from DB:");
        console.log("ID:", latestDoc._id);
        console.log("Filename:", latestDoc.filename);
        console.log("OriginalName:", latestDoc.originalName);
        console.log("UserId:", latestDoc.userId);

        console.log("\nAttempting to manually save this document to DocumentHistory to check for validation errors...");
        
        const historyEntry = new DocumentHistory({
            _id: latestDoc._id,
            userId: latestDoc.userId,
            filename: latestDoc.filename,
            originalName: latestDoc.originalName,
            documentName: latestDoc.originalName,
            language: 'English',
            uploadDate: latestDoc.createdAt,
            lastOpened: latestDoc.updatedAt,
            documentType: latestDoc.structuredData?.documentType || 'Unknown',
            fileSize: 1024 * 1024, // fallback file size
            extractedText: latestDoc.extractedText,
            summary: {
                markdown: 'Test summary',
                aiSummary: latestDoc.aiSummary,
                simpleLanguageSummary: latestDoc.simpleLanguageSummary
            },
            metadata: {
                structuredData: latestDoc.structuredData,
                citizenSummary: latestDoc.citizenSummary,
                riskAnalysis: latestDoc.riskAnalysis,
                timeline: latestDoc.timeline,
                confidenceScores: latestDoc.confidenceScores
            },
            downloads: {
                extractedText: `/api/documents/${latestDoc._id}/download/txt`,
                pdf: `/api/documents/${latestDoc._id}/download/pdf`
            },
            ragData: {
                indexed: true,
                vectorStorePath: 'faiss_store'
            },
            favorite: false,
            tags: [],
            processingStatus: "Completed"
        });

        await historyEntry.save();
        console.log("SUCCESS: Manually saved to DocumentHistory!");
        
        // Clean it up
        await DocumentHistory.deleteOne({ _id: latestDoc._id });
        console.log("Cleanup of test history entry complete.");

    } catch (err) {
        console.error("ERROR during DocumentHistory save:", err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
