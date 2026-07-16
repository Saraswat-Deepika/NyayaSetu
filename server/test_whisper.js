require('dotenv').config();
const { transcribeAudio } = require('./services/whisperService');
const fs = require('fs');

async function test() {
    try {
        const testFile = './test_audio.webm';
        if (!fs.existsSync(testFile)) {
            fs.writeFileSync(testFile, 'dummy data'); // Just to see what error Gemini throws for invalid data, or we could create a valid one
        }
        const transcript = await transcribeAudio(testFile, 'English');
        console.log('Transcript:', transcript);
    } catch (err) {
        console.error('Test failed:', err);
    }
}
test();
