require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { uploadDocument } = require('./controllers/documentController');

const testFile = 'c:\\Users\\Lenovo\\NyayaSetu\\server\\uploads\\document-1781674944839.pdf';

async function run() {
    console.log("Connecting to database...");
    await connectDB();

    const dummyUser = {
        _id: new mongoose.Types.ObjectId()
    };

    const req = {
        file: {
            path: testFile,
            mimetype: 'application/pdf',
            filename: 'document-1781673883649.pdf',
            originalname: 'faiss & bert.pdf'
        },
        body: {
            caseId: '',
            language: 'English'
        },
        user: dummyUser
    };

    const res = {
        statusCode: 200,
        status: function(code) {
            this.statusCode = code;
            console.log(`[Response] Status set to: ${code}`);
            return this;
        },
        json: function(data) {
            console.log(`[Response] JSON sent with status ${this.statusCode}:`);
            console.log(JSON.stringify(data, null, 2).slice(0, 1000));
            mongoose.connection.close();
            process.exit(0);
        }
    };

    console.log("\nCalling uploadDocument controller...");
    try {
        await uploadDocument(req, res);
    } catch (err) {
        console.error("Controller threw unhandled exception:", err);
        mongoose.connection.close();
    }
}
run();
