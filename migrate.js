const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'server');
const ops = [
    // Scripts
    { from: 'import_bnss.js', to: 'scripts/import_bnss.js' },
    { from: 'import_bsa.js', to: 'scripts/import_bsa.js' },
    { from: 'list_models.js', to: 'scripts/list_models.js' },
    { from: 'scratch_test_telemetry.js', to: 'scripts/scratch_test_telemetry.js' },
    
    // Tests
    { from: 'test-pdf.js', to: 'tests/test_pdf.js' },
    { from: 'test_controller_debug.js', to: 'tests/test_controller_debug.js' },
    { from: 'test_faiss_step.js', to: 'tests/test_faiss_step.js' },
    { from: 'test_list_models.js', to: 'tests/test_list_models.js' },
    { from: 'test_upload_api.js', to: 'tests/test_upload_api.js' },
    { from: 'test_upload_debug.js', to: 'tests/test_upload_debug.js' },
    { from: '../test_gemini.js', to: 'tests/test_gemini.js' },
];

// Ensure dirs
['scripts', 'tests', 'uploads/pdfs', 'vector_store'].forEach(dir => {
    const fullPath = path.join(root, dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// Execute moves
ops.forEach(op => {
    const fromPath = path.join(root, op.from);
    const toPath = path.join(root, op.to);
    try {
        if (fs.existsSync(fromPath)) {
            fs.renameSync(fromPath, toPath);
            console.log(`Moved ${op.from} to ${op.to}`);
        } else {
            console.log(`File not found: ${fromPath}`);
        }
    } catch (e) {
        console.error(`Error moving ${op.from}:`, e.message);
    }
});

// Rename faiss_store to vector_store if needed
try {
    const oldFaiss = path.join(root, 'faiss_store');
    const newFaiss = path.join(root, 'vector_store');
    
    // If faiss.index is inside faiss_store, move it to vector_store
    if (fs.existsSync(oldFaiss)) {
        ['faiss.index', 'docstore.json', 'metadata.json'].forEach(file => {
            const f = path.join(oldFaiss, file);
            if (fs.existsSync(f)) {
                let toName = file === 'docstore.json' ? 'metadata.json' : file;
                fs.renameSync(f, path.join(newFaiss, toName));
                console.log(`Moved ${file} to vector_store/${toName}`);
            }
        });
        
        // Remove old dir
        try { fs.rmdirSync(oldFaiss); } catch(e){}
    }
} catch(e) { console.error('Faiss error', e.message); }

// Move PDFs
try {
    const uploadsPath = path.join(root, 'uploads');
    const pdfsPath = path.join(uploadsPath, 'pdfs');
    if (fs.existsSync(uploadsPath)) {
        const files = fs.readdirSync(uploadsPath);
        files.forEach(f => {
            const fp = path.join(uploadsPath, f);
            if (fs.statSync(fp).isFile()) {
                if (f.endsWith('.pdf')) {
                    fs.renameSync(fp, path.join(pdfsPath, f));
                    console.log(`Moved ${f} to pdfs/`);
                } else if (f.endsWith('.wav') || f.endsWith('.mp3')) {
                    fs.unlinkSync(fp);
                    console.log(`Deleted ${f}`);
                }
            }
        });
    }
} catch(e) { console.error('Uploads error', e.message); }
