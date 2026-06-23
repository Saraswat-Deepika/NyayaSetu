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

// Import Routes
const authRoutes = require('./routes/auth');
const voiceRoutes = require('./routes/voice');
const translateRoutes = require('./routes/translate');
const legalRoutes = require('./routes/legal');
const documentsRoutes = require('./routes/documents');
const banditRoutes = require('./routes/bandit');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api', banditRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
// Trigger reload for MOCK_AI config change
