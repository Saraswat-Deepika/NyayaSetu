require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Document = require('../models/Document');
const { extractTextFromPDF } = require('../services/pdf/pdfExtractor');
const { chunkText } = require('../services/rag/chunkService');
const { addDocumentsToStore } = require('../services/vector/faissService');

const PDF_DIR = path.join(__dirname, '../uploads/pdfs');

const ingestDocuments = async () => {
    try {
        await connectDB();
        console.log(`Starting ingestion from directory: ${PDF_DIR}`);

        if (!fs.existsSync(PDF_DIR)) {
            console.log(`Directory does not exist: ${PDF_DIR}`);
            process.exit(0);
        }

        const files = fs.readdirSync(PDF_DIR).filter(file => file.toLowerCase().endsWith('.pdf'));

        if (files.length === 0) {
            console.log('No PDF files found to ingest.');
            process.exit(0);
        }

        for (const file of files) {
            console.log(`\nProcessing file: ${file}`);
            const filePath = path.join(PDF_DIR, file);

            try {
                // Check if already in DB
                let doc = await Document.findOne({ filename: file });
                let documentId = doc ? doc._id.toString() : `auto_${Date.now()}`;

                const text = await extractTextFromPDF(filePath);
                if (!text || text.trim().length === 0) {
                    console.log(`Skipping ${file}: No text could be extracted.`);
                    continue;
                }

                const docs = await chunkText(text, documentId);
                await addDocumentsToStore(docs);

                console.log(`Successfully ingested ${file} (${docs.length} chunks added to FAISS)`);
            } catch (err) {
                console.error(`Error processing ${file}: ${err.message}`);
            }
        }

        console.log('\nIngestion completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Ingestion failed:', error);
        process.exit(1);
    }
};

ingestDocuments();
