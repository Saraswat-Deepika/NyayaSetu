require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const testFile = 'c:\\Users\\Lenovo\\NyayaSetu\\server\\uploads\\document-1781674944839.pdf';

async function run() {
    try {
        console.log("1. Authenticating/Registering test user...");
        let token = "";
        try {
            const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
                email: 'testuser456@example.com',
                password: 'Password123'
            });
            token = loginRes.data.token;
            console.log("Logged in successfully!");
        } catch (e) {
            console.log("Login failed, trying to register...");
            const registerRes = await axios.post('http://localhost:5000/api/auth/register', {
                name: 'Test User',
                email: 'testuser456@example.com',
                password: 'Password123',
                phone: '1234567890',
                preferredLanguage: 'English'
            });
            token = registerRes.data.token;
            console.log("Registered and logged in successfully!");
        }

        console.log("\n2. Sending POST upload request to backend...");
        const form = new FormData();
        form.append('document', fs.createReadStream(testFile));
        form.append('language', 'English');

        console.time("Upload API duration");
        const uploadRes = await axios.post('http://localhost:5000/api/documents/upload', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.timeEnd("Upload API duration");

        console.log("\nResponse Status:", uploadRes.status);
        console.log("Response Data Summary Key exists:", !!uploadRes.data.summary);
        console.log("citizenSummary exists in rawSummary:", !!uploadRes.data.rawSummary?.citizenSummary);
        console.log("citizenSummary content:", JSON.stringify(uploadRes.data.rawSummary?.citizenSummary, null, 2));
        console.log("Response data snippet:", JSON.stringify(uploadRes.data).slice(0, 500));

    } catch (e) {
        if (e.response) {
            console.error("HTTP Error:", e.response.status, e.response.data);
        } else {
            console.error("Error:", e.message);
        }
    }
}
run();
