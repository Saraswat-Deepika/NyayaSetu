const mongoose = require('mongoose');
require('dotenv').config();
const { seedLawyers } = require('./controllers/lawyerController');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected to DB");
        const req = {};
        const res = {
            status: function(code) { this.code = code; return this; },
            json: function(data) { console.log(this.code, data); process.exit(0); }
        };
        await seedLawyers(req, res);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
