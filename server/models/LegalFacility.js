const mongoose = require('mongoose');

const legalFacilitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: [
            'Police Station', 
            'District Court', 
            'High Court', 
            'Legal Aid Center', 
            'Women Police Station', 
            'Cyber Crime Police Station'
        ]
    },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    phone: { type: String, default: '' },
    googleMapsUrl: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('LegalFacility', legalFacilitySchema);
