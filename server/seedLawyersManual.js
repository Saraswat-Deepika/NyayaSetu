const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Lawyer = require('./models/Lawyer');
const Law = require('./models/Law');
const LegalFacility = require('./models/LegalFacility');
const seedDB = require('./config/seed');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected to MongoDB for manual seeding...");
        
        // Remove existing lawyers for a clean seed
        await Lawyer.deleteMany({});
        
        // Find if users exist, delete them so we can re-create with the lawyer role
        const mockEmails = ['ramesh@lawyer.com', 'sneha@lawyer.com', 'vikram@lawyer.com'];
        await User.deleteMany({ email: { $in: mockEmails } });

        console.log("Cleared old mock data. Running seedDB()...");
        await seedDB();
        
        console.log("Seed completed. Exiting...");
        process.exit(0);
    })
    .catch(err => {
        console.error("Error during manual seed:", err);
        process.exit(1);
    });
