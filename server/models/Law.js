const mongoose = require('mongoose');

const lawSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    keywords: [{ type: String }],
    sections: [{
        number: { type: String, required: true },
        title: { type: String, required: true },
        explanation: { type: String, required: true }
    }],
    officialLink: { type: String, required: true },
    description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Law', lawSchema);
