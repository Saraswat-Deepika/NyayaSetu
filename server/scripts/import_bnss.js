const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://DeepikaSaraswat:Deep%4079004@cluster0.qyozr5a.mongodb.net/nyayasetu?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected to MongoDB.");
    
    const jsonPath = path.join(__dirname, '../BNSS_Full_MongoDB.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const collectionName = data.mongo_collection || 'bnss_sections';
    
    const collection = mongoose.connection.collection(collectionName);
    
    // Clear existing data
    await collection.deleteMany({ act: data.act });
    console.log(`Cleared existing data for ${data.act} in ${collectionName}`);
    
    // Insert the chapters array as multiple documents, adding the 'act' field to each
    const docsToInsert = data.chapters.map(ch => ({
        act: data.act,
        chapter_no: ch.chapter_no,
        chapter_title: ch.chapter_title,
        sections: ch.sections
    }));
    
    const result = await collection.insertMany(docsToInsert);
    console.log(`Successfully inserted ${result.insertedCount} chapters into ${collectionName} collection!`);
    
    process.exit(0);
}).catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
