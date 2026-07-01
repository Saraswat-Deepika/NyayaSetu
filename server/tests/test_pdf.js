const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');

const testFile = path.join(__dirname, 'uploads/document-1781530156350.pdf');

async function test() {
    try {
        const dataBuffer = fs.readFileSync(testFile);
        console.log("File read successfully, parsing...");
        const data = await pdfParse(dataBuffer);
        console.log("Parse success! Text length:", data.text.length);
    } catch (error) {
        console.error("Parse error:", error);
    }
}

test();
