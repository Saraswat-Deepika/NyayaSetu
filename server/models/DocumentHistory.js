const mongoose = require('mongoose');

const documentHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    documentName: { type: String, required: true },
    language: { type: String, default: 'English' },
    uploadDate: { type: Date, default: Date.now },
    lastOpened: { type: Date, default: Date.now },
    documentType: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }, // Structured data, citizenSummary, risks, timeline, etc.
    extractedText: { type: String },
    summary: { type: mongoose.Schema.Types.Mixed }, // Formatted markdown & parts of AI summaries
    downloads: { type: mongoose.Schema.Types.Mixed }, // Download link targets
    ragData: { type: mongoose.Schema.Types.Mixed }, // FAISS config / index status
    favorite: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    tags: { type: [String], default: [] },
    fileSize: { type: Number },
    storageUsed: { type: Number },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    thumbnail: { type: String },
    processingStatus: { type: String, default: 'Completed' }
}, { timestamps: true });

// Define requested performance indexes
documentHistorySchema.index({ userId: 1 });
documentHistorySchema.index({ uploadDate: -1 });
documentHistorySchema.index({ lastOpened: -1 });
documentHistorySchema.index({ documentName: 1 });
documentHistorySchema.index({ favorite: 1 });
documentHistorySchema.index({ pinned: 1 });
documentHistorySchema.index({ deleted: 1 });
documentHistorySchema.index({ filename: 1 });
documentHistorySchema.index({ language: 1 });
documentHistorySchema.index({ tags: 1 });
documentHistorySchema.index({ 'metadata.structuredData.courtName': 1 });
documentHistorySchema.index({ 'metadata.structuredData.judgeName': 1 });
documentHistorySchema.index({ 'metadata.structuredData.documentType': 1 });

module.exports = mongoose.model('DocumentHistory', documentHistorySchema);
