const mongoose = require('mongoose');
const DocumentHistory = require('./models/DocumentHistory');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nyayasetu');
        console.log("Connected to DB.");

        const histories = await DocumentHistory.find({});
        console.log("Total DocumentHistories in DB:", histories.length);
        histories.forEach((h, idx) => {
            console.log(`History ${idx+1}: ID=${h._id}, userId=${h.userId}, name=${h.documentName}, size=${h.fileSize}, deleted=${h.deleted}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
