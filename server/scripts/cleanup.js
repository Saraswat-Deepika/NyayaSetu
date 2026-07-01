const fs = require('fs');
const path = require('path');

const filesToDelete = [
    'controllers/banditController.js',
    'controllers/documentController.js',
    'controllers/legalController.js',
    'controllers/ocrController.js',
    'controllers/translateController.js',
    'controllers/voiceController.js',
    'routes/auth.js',
    'routes/bandit.js',
    'routes/documents.js',
    'routes/legal.js',
    'routes/translate.js',
    'routes/voice.js',
    'services/pdfService.js',
    'services/ragService.js',
    'services/geminiService.js'
];

filesToDelete.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file}`);
    }
});

console.log('Cleanup completed successfully.');
