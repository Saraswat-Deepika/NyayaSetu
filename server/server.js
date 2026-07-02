require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

const app = express();

// Connect to database
connectDB();

// Seed Database
const seedDB = require('./config/seed');
seedDB();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'NyayaSetu API is running healthy' });
});

// Basic Route
app.get('/', (req, res) => {
    res.send('NyayaSetu API is running...');
});

// Import Routes
const authRoutes = require('./routes/auth');
const voiceRoutes = require('./routes/voice');
const translateRoutes = require('./routes/translate');
const legalRoutes = require('./routes/legal');
const documentsRoutes = require('./routes/documents');
const banditRoutes = require('./routes/bandit');
const historyRoutes = require('./routes/history');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', banditRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Daily Trash Auto-Purge Daemon (Runs permanently every 24 hours, deletes items older than 30 days)
const DocumentHistory = require('./models/DocumentHistory');
const Document = require('./models/Document');
const fs = require('fs');

const runTrashCleanup = async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const expiredDocs = await DocumentHistory.find({
            deleted: true,
            deletedAt: { $lte: thirtyDaysAgo }
        });

        if (expiredDocs.length > 0) {
            console.log(`[Trash Cleanup Daemon] Found ${expiredDocs.length} expired documents. Purging permanently...`);
            for (const doc of expiredDocs) {
                // Delete actual physical file from uploads folder
                const mainDoc = await Document.findById(doc._id);
                if (mainDoc && mainDoc.uploadPath && fs.existsSync(mainDoc.uploadPath)) {
                    fs.unlinkSync(mainDoc.uploadPath);
                }
                
                // Delete from collections
                await Document.deleteOne({ _id: doc._id });
                await DocumentHistory.deleteOne({ _id: doc._id });
            }
            console.log(`[Trash Cleanup Daemon] Purged ${expiredDocs.length} documents.`);
        }
    } catch (err) {
        console.error("[Trash Cleanup Daemon] Error running purge job:", err);
    }
};

// Run immediately on boot
runTrashCleanup();
// Run every 24 hours
setInterval(runTrashCleanup, 24 * 60 * 60 * 1000);
