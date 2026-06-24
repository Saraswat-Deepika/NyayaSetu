const axios = require('axios');

async function run() {
    try {
        const rand = Math.floor(Math.random() * 100000);
        const email = `testuser_${rand}@test.com`;
        const password = 'Password123!';
        
        console.log(`Registering user with email: ${email}...`);
        const regRes = await axios.post('http://localhost:5000/api/auth/register', {
            name: 'Test User',
            email: email,
            password: password
        });

        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: email,
            password: password
        });
        const token = loginRes.data.token;

        // 1. Check if the /bandit/stats endpoint is gone (should return 404)
        console.log('\n--- Checking if /bandit/stats is disabled (security check) ---');
        try {
            await axios.get('http://localhost:5000/api/bandit/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.error('❌ FAILURE: /bandit/stats is still accessible!');
        } catch (err) {
            console.log(`✅ SUCCESS: /bandit/stats returned status code ${err.response ? err.response.status : err.message} (expected 404 Not Found)`);
        }

        // 2. Submit a legal query (triggers [MAB SELECT])
        console.log('\n--- Sending legal query to trigger selection log ---');
        const askRes = await axios.post('http://localhost:5000/api/legal/ask', {
            question: "Pehle bhi aise bhi koi case hua hai ki laptop chori hone ka khabar hua hai to unko wapas mila lagta hai?",
            language: "Hinglish"
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Ask Response status:', askRes.status);
        const caseId = askRes.data.case?._id;
        console.log('Created Case ID:', caseId);

        // 3. Submit feedback (triggers [MAB REWARD UPDATE] and [MAB CATEGORY PERFORMANCE])
        console.log('\n--- Submitting feedback to trigger reward and performance logs ---');
        const feedRes = await axios.post('http://localhost:5000/api/feedback', {
            queryId: caseId,
            feedback: 'helpful'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Feedback Response status:', feedRes.status);
        console.log('Feedback Response data:', feedRes.data);

    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

run();
