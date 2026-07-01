const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { extractLegalSections } = require('./legalSectionParser');

function buildMetadata(heading, documentId, chunkNumber) {
    let section = "";
    let chapter = "";
    let article = "";

    const lower = heading.trim().toLowerCase();
    const parts = heading.trim().split(/\s+/);
    
    if (lower.startsWith("section") || lower.startsWith("sec.")) {
        section = parts[1] || "";
    } else if (lower.startsWith("chapter")) {
        chapter = parts[1] || "";
    } else if (lower.startsWith("article")) {
        article = parts[1] || "";
    }

    return {
        document: "",
        documentId: documentId || "",
        act: "",
        section: section,
        chapter: chapter,
        article: article,
        page: "",
        chunkNumber: chunkNumber.toString(),
        text: ""
    };
}

const chunkText = async (text, documentId) => {
    const sections = extractLegalSections(text);
    const allChunks = [];
    let globalChunkIndex = 1;

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n\n", "\n", ".", " ", ""],
    });

    const largeSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 100000,
        chunkOverlap: 0,
    });

    for (const section of sections) {
        let sectionContent = section.content;
        if (section.heading !== "General") {
            sectionContent = `${section.heading}\n${sectionContent}`.trim();
        }

        if (!sectionContent) continue;

        const baseMetadata = buildMetadata(section.heading, documentId, globalChunkIndex);

        if (sectionContent.length > 1200) {
            const splitDocs = await splitter.createDocuments([sectionContent], [baseMetadata]);
            
            for (const doc of splitDocs) {
                doc.metadata = { 
                    ...doc.metadata, 
                    chunkNumber: globalChunkIndex.toString(),
                    text: doc.pageContent 
                };
                allChunks.push(doc);
                globalChunkIndex++;
            }
        } else {
            const splitDocs = await largeSplitter.createDocuments([sectionContent], [baseMetadata]);
            if (splitDocs && splitDocs.length > 0) {
                const doc = splitDocs[0];
                doc.metadata.text = doc.pageContent;
                allChunks.push(doc);
                globalChunkIndex++;
            }
        }
    }

    return allChunks;
};

module.exports = {
    chunkText,
    buildMetadata, // Exporting for testing
    extractLegalSections // Exporting for testing
};
