require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

const app = express();

// Connect to database
connectDB();

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

app.get('/import-bnss', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const mongoose = require('mongoose');
        const jsonPath = path.join(__dirname, '../BNSS_Full_MongoDB.json');
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const collectionName = data.mongo_collection || 'bnss_sections';
        const collection = mongoose.connection.collection(collectionName);
        await collection.deleteMany({ act: data.act });
        const docsToInsert = data.chapters.map(ch => ({
            act: data.act,
            chapter_no: ch.chapter_no,
            chapter_title: ch.chapter_title,
            sections: ch.sections
        }));
        const result = await collection.insertMany(docsToInsert);
        res.status(200).json({ message: `Successfully inserted ${result.insertedCount} chapters into ${collectionName}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/import-bsa', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const mongoose = require('mongoose');
        const jsonPath = path.join(__dirname, '../BSA_Full_MongoDB.json');
        if (!fs.existsSync(jsonPath)) {
            return res.status(404).json({ error: 'BSA_Full_MongoDB.json not found' });
        }
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const collectionName = data.mongo_collection || 'bsa_sections';
        const collection = mongoose.connection.collection(collectionName);
        await collection.deleteMany({ act: data.act });
        const docsToInsert = data.chapters.map(ch => ({
            act: data.act,
            chapter_no: ch.chapter_no,
            chapter_title: ch.chapter_title,
            sections: ch.sections
        }));
        const result = await collection.insertMany(docsToInsert);
        res.status(200).json({ message: `Successfully inserted ${result.insertedCount} chapters into ${collectionName}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const ragRoutes = require('./routes/ragRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Use Routes
app.use('/api', authRoutes);
app.use('/api', chatRoutes);
app.use('/api', ragRoutes);
app.use('/api', uploadRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
// Trigger reload for MOCK_AI config change
