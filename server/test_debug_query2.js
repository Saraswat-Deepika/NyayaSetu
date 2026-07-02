require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Mongo error:", err));

const { askLegalQuestion } = require('./controllers/legalController');

async function run() {
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000));

    const req = {
        body: {
            question: "my phone is missing since last 2 days , how can i get back this...plz tell me the steps or whrere should i go",
            history: [],
            language: "English"
        },
        user: null // Unauthenticated request
    };

    const res = {
        status: function(code) {
            console.log(`Response status code: ${code}`);
            return this;
        },
        json: function(data) {
            console.log("Response JSON data:", JSON.stringify(data, null, 2));
            return this;
        }
    };

    console.log("Calling askLegalQuestion...");
    try {
        await askLegalQuestion(req, res);
    } catch (e) {
        console.error("Uncaught error during askLegalQuestion:", e);
    }

    mongoose.disconnect();
}

run();
