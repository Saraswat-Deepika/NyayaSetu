const DocumentHistory = require('../models/DocumentHistory');
const Document = require('../models/Document');
const { searchRelevantDocs } = require('../services/ragService');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { getStorageLimits } = require('../config/storage');

// @desc    Get user document history with search, sort, filter, and pagination
// @route   GET /api/history
// @access  Private
const getHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { userId };

        // Soft-delete query filter logic
        const activeFilters = req.query.filter ? req.query.filter.split(',').map(f => f.trim()) : [];
        if (activeFilters.includes('Trash')) {
            query.deleted = true;
        } else {
            query.deleted = { $ne: true };
        }

        // 1. Search Query Logic (Matches: document name, case number, parties, judge, tags, notes, and year)
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            
            // Build the basic list of search targets
            const orConditions = [
                { documentName: searchRegex },
                { filename: searchRegex },
                { originalName: searchRegex },
                { notes: searchRegex },
                { 'metadata.structuredData.caseNumber': searchRegex },
                { 'metadata.structuredData.partiesInvolved': searchRegex },
                { 'metadata.structuredData.judgeName': searchRegex },
                { 'metadata.structuredData.petitioner': searchRegex },
                { 'metadata.structuredData.respondent': searchRegex },
                { tags: searchRegex }
            ];

            // If the search query looks like a year, try to match year in the filingDate field
            const searchYear = parseInt(req.query.search);
            if (!isNaN(searchYear) && searchYear >= 1800 && searchYear <= 2100) {
                orConditions.push({ 'metadata.structuredData.filingDate': searchRegex });
            }

            // AI Smart Search (Semantic Search in Vector Store)
            try {
                const vectorResults = await searchRelevantDocs(req.query.search, null);
                if (vectorResults && vectorResults.length > 0) {
                    const semanticDocIds = vectorResults
                        .map(doc => doc.metadata?.documentId)
                        .filter(Boolean);
                    
                    if (semanticDocIds.length > 0) {
                        orConditions.push({ _id: { $in: semanticDocIds } });
                    }
                }
            } catch (err) {
                console.warn("AI Smart Search semantic retrieval skipped/failed:", err.message);
            }

            query.$or = orConditions;
        }

        // 2. Filter Chips Logic (Multi-select supported via comma separation)
        if (req.query.filter && req.query.filter !== 'All') {
            const andConditions = [];

            // 2a. Court / Document type filters (OR-ed within group)
            const typeConditions = [];
            if (activeFilters.includes('Supreme Court')) {
                typeConditions.push(
                    { documentType: /Supreme Court/i },
                    { 'metadata.structuredData.courtName': /Supreme Court/i }
                );
            }
            if (activeFilters.includes('High Court')) {
                typeConditions.push(
                    { documentType: /High Court/i },
                    { 'metadata.structuredData.courtName': /High Court/i }
                );
            }
            if (activeFilters.includes('Acts')) {
                typeConditions.push(
                    { documentType: /Act/i },
                    { 'metadata.structuredData.documentType': /Act/i }
                );
            }
            if (activeFilters.includes('Contracts')) {
                typeConditions.push(
                    { documentType: /Contract|Agreement|Lease|Deed/i },
                    { 'metadata.structuredData.documentType': /Contract|Agreement|Lease|Deed/i }
                );
            }
            if (typeConditions.length > 0) {
                andConditions.push({ $or: typeConditions });
            }

            // 2b. Language filters (OR-ed within group)
            const langConditions = [];
            if (activeFilters.includes('English')) {
                langConditions.push({ language: /English/i });
            }
            if (activeFilters.includes('Hindi')) {
                langConditions.push({ language: /Hindi/i });
            }
            if (langConditions.length > 0) {
                andConditions.push({ $or: langConditions });
            }

            // 2c. Boolean flag filters (AND-ed)
            if (activeFilters.includes('Favorites')) {
                andConditions.push({ favorite: true });
            }
            if (activeFilters.includes('Pinned')) {
                andConditions.push({ pinned: true });
            }
            if (activeFilters.includes('Recent')) {
                // Opened in last 7 days
                andConditions.push({ lastOpened: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
            }

            if (andConditions.length > 0) {
                query.$and = query.$and ? [...query.$and, ...andConditions] : andConditions;
            }
        }

        // 3. Advanced Search Granular Filters
        if (req.query.uploadDateStart || req.query.uploadDateEnd) {
            const dateQuery = {};
            if (req.query.uploadDateStart) dateQuery.$gte = new Date(req.query.uploadDateStart);
            if (req.query.uploadDateEnd) dateQuery.$lte = new Date(req.query.uploadDateEnd);
            query.uploadDate = dateQuery;
        }
        if (req.query.court) {
            query['metadata.structuredData.courtName'] = new RegExp(req.query.court, 'i');
        }
        if (req.query.judge) {
            query['metadata.structuredData.judgeName'] = new RegExp(req.query.judge, 'i');
        }
        if (req.query.language) {
            query.language = new RegExp(req.query.language, 'i');
        }
        if (req.query.documentType) {
            query.documentType = new RegExp(req.query.documentType, 'i');
        }
        if (req.query.tags) {
            const tagsArr = req.query.tags.split(',').map(t => t.trim());
            query.tags = { $in: tagsArr.map(t => new RegExp(t, 'i')) };
        }
        if (req.query.minSize || req.query.maxSize) {
            const sizeQuery = {};
            if (req.query.minSize) sizeQuery.$gte = parseInt(req.query.minSize);
            if (req.query.maxSize) sizeQuery.$lte = parseInt(req.query.maxSize);
            query.fileSize = sizeQuery;
        }
        if (req.query.favorite !== undefined) {
            query.favorite = req.query.favorite === 'true';
        }
        if (req.query.pinned !== undefined) {
            query.pinned = req.query.pinned === 'true';
        }

        // 4. Sorting Logic (Always keep Pinned at the top)
        let sort = { pinned: -1, uploadDate: -1 };
        if (req.query.sortBy) {
            const sortBy = req.query.sortBy;
            if (sortBy === 'Recent') {
                sort = { pinned: -1, uploadDate: -1 };
            } else if (sortBy === 'Oldest') {
                sort = { pinned: -1, uploadDate: 1 };
            } else if (sortBy === 'Name') {
                sort = { pinned: -1, documentName: 1 };
            } else if (sortBy === 'Last Opened') {
                sort = { pinned: -1, lastOpened: -1 };
            }
        }

        // 5. Fetch Paginated Records
        const total = await DocumentHistory.countDocuments(query);
        const documents = await DocumentHistory.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // 6. User Storage Stats Aggregation (Total count & combined file size)
        const statsResult = await DocumentHistory.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), deleted: { $ne: true } } },
            { 
                $group: { 
                    _id: null, 
                    totalDocs: { $sum: 1 }, 
                    totalSize: { $sum: '$fileSize' } 
                } 
            }
        ]);

        // Find largest document (not deleted)
        const largestDoc = await DocumentHistory.findOne({ userId, deleted: { $ne: true } })
            .sort({ fileSize: -1 })
            .select('documentName fileSize');
            
        // Find last uploaded document (not deleted)
        const lastUploadedDoc = await DocumentHistory.findOne({ userId, deleted: { $ne: true } })
            .sort({ uploadDate: -1 })
            .select('documentName uploadDate');

        // Storage Limits Configuration
        const plan = req.user?.plan || 'Free';
        const planLimits = getStorageLimits(plan);

        const stats = {
            totalDocs: statsResult[0]?.totalDocs || 0,
            totalSize: statsResult[0]?.totalSize || 0,
            maxDocs: planLimits.maxDocs,
            maxSize: planLimits.maxSize,
            largestDoc: largestDoc ? { name: largestDoc.documentName, size: largestDoc.fileSize } : null,
            lastUploaded: lastUploadedDoc ? { name: lastUploadedDoc.documentName, date: lastUploadedDoc.uploadDate } : null
        };

        res.json({
            documents,
            page,
            pages: Math.ceil(total / limit),
            total,
            stats
        });
    } catch (error) {
        console.error("Get History Error:", error);
        res.status(500).json({ error: 'Server error fetching document history' });
    }
};

// @desc    Get single document history detail by ID
// @route   GET /api/history/:id
// @access  Private
const getHistoryById = async (req, res) => {
    try {
        const history = await DocumentHistory.findOne({ _id: req.params.id, userId: req.user._id });
        if (!history) {
            return res.status(404).json({ error: 'Document not found in your history' });
        }

        // Format to map the shape of result expected by DocumentUploadPage
        res.json({
            message: 'Document retrieved successfully',
            documentId: history._id,
            filename: history.filename,
            originalName: history.originalName,
            documentName: history.documentName,
            language: history.language,
            extractedText: history.extractedText,
            summary: history.summary?.markdown || '',
            rawSummary: {
                structuredData: history.metadata?.structuredData || {},
                aiSummary: history.summary?.aiSummary || {},
                simpleLanguageSummary: history.summary?.simpleLanguageSummary || '',
                citizenSummary: history.metadata?.citizenSummary || {},
                riskAnalysis: history.metadata?.riskAnalysis || [],
                timeline: history.metadata?.timeline || [],
                confidenceScores: history.metadata?.confidenceScores || {}
            }
        });
    } catch (error) {
        console.error("Get History By ID Error:", error);
        res.status(500).json({ error: 'Server error retrieving document history detail' });
    }
};

// @desc    Manually create a document history record
// @route   POST /api/history
// @access  Private
const createHistory = async (req, res) => {
    try {
        const historyData = { ...req.body, userId: req.user._id };
        const newHistory = new DocumentHistory(historyData);
        await newHistory.save();
        res.status(201).json(newHistory);
    } catch (error) {
        console.error("Create History Error:", error);
        res.status(500).json({ error: 'Server error creating history record: ' + error.message });
    }
};

// @desc    Update a document history record metadata/notes
// @route   PUT /api/history/:id
// @access  Private
const updateHistory = async (req, res) => {
    try {
        const history = await DocumentHistory.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: req.body },
            { new: true }
        );
        if (!history) {
            return res.status(404).json({ error: 'Document not found in your history' });
        }
        res.json(history);
    } catch (error) {
        console.error("Update History Error:", error);
        res.status(500).json({ error: 'Server error updating history details' });
    }
};

// @desc    Delete a document from user's history (soft-delete to trash on first trigger, permanent delete on second)
// @route   DELETE /api/history/:id
// @access  Private
const deleteHistory = async (req, res) => {
    try {
        const history = await DocumentHistory.findOne({ _id: req.params.id, userId: req.user._id });
        if (!history) {
            return res.status(404).json({ error: 'Document not found in your history' });
        }

        // If already soft-deleted OR request explicitly specifies permanent deletion
        if (history.deleted || req.query.permanent === 'true') {
            // Delete raw uploaded file from disk
            const doc = await Document.findById(req.params.id);
            if (doc && doc.uploadPath && fs.existsSync(doc.uploadPath)) {
                fs.unlinkSync(doc.uploadPath);
            }
            
            // Delete from database
            await Document.deleteOne({ _id: req.params.id });
            await DocumentHistory.deleteOne({ _id: req.params.id, userId: req.user._id });
            
            return res.json({ message: 'Document permanently deleted successfully', permanent: true });
        } else {
            // Soft-delete to Trash
            history.deleted = true;
            history.deletedAt = new Date();
            await history.save();
            
            return res.json({ message: 'Document moved to Trash successfully', softDeleted: true });
        }
    } catch (error) {
        console.error("Delete History Error:", error);
        res.status(500).json({ error: 'Server error deleting document history' });
    }
};

// @desc    Restore a document from Trash
// @route   PATCH /api/history/:id/restore
// @access  Private
const restoreHistory = async (req, res) => {
    try {
        const history = await DocumentHistory.findOne({ _id: req.params.id, userId: req.user._id });
        if (!history) {
            return res.status(404).json({ error: 'Document not found in your history' });
        }

        history.deleted = false;
        history.deletedAt = null;
        await history.save();

        res.json({ message: 'Document restored successfully', document: history });
    } catch (error) {
        console.error("Restore History Error:", error);
        res.status(500).json({ error: 'Server error restoring document history' });
    }
};

// @desc    Permanently delete all soft-deleted documents (Empty Trash)
// @route   DELETE /api/history/trash/empty
// @access  Private
const emptyTrash = async (req, res) => {
    try {
        const userId = req.user._id;
        const trashedDocs = await DocumentHistory.find({ userId, deleted: true });

        if (trashedDocs.length === 0) {
            return res.json({ message: 'Trash is already empty' });
        }

        for (const doc of trashedDocs) {
            const mainDoc = await Document.findById(doc._id);
            if (mainDoc && mainDoc.uploadPath && fs.existsSync(mainDoc.uploadPath)) {
                fs.unlinkSync(mainDoc.uploadPath);
            }
            await Document.deleteOne({ _id: doc._id });
            await DocumentHistory.deleteOne({ _id: doc._id });
        }

        res.json({ message: 'Trash emptied successfully' });
    } catch (error) {
        console.error("Empty Trash Error:", error);
        res.status(500).json({ error: 'Server error emptying trash' });
    }
};

// @desc    Toggle favorite flag on history document
// @route   PATCH /api/history/:id/favorite
// @access  Private
const toggleFavorite = async (req, res) => {
    try {
        const history = await DocumentHistory.findOne({ _id: req.params.id, userId: req.user._id });
        if (!history) {
            return res.status(404).json({ error: 'Document not found in your history' });
        }
        
        history.favorite = !history.favorite;
        await history.save();

        res.json({ 
            favorite: history.favorite, 
            message: `Document ${history.favorite ? 'marked as favorite' : 'removed from favorites'}` 
        });
    } catch (error) {
        console.error("Toggle Favorite Error:", error);
        res.status(500).json({ error: 'Server error updating favorite status' });
    }
};

// @desc    Record document is opened and update lastOpened timestamp
// @route   PATCH /api/history/:id/open
// @access  Private
const recordOpen = async (req, res) => {
    try {
        const history = await DocumentHistory.findOne({ _id: req.params.id, userId: req.user._id });
        if (!history) {
            return res.status(404).json({ error: 'Document not found in your history' });
        }

        history.lastOpened = new Date();
        await history.save();

        res.json({ 
            lastOpened: history.lastOpened, 
            message: 'Document open timestamp recorded' 
        });
    } catch (error) {
        console.error("Record Open Error:", error);
        res.status(500).json({ error: 'Server error recording open timestamp' });
    }
};

module.exports = {
    getHistory,
    getHistoryById,
    createHistory,
    updateHistory,
    deleteHistory,
    restoreHistory,
    emptyTrash,
    toggleFavorite,
    recordOpen
};
