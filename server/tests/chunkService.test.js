const assert = require('assert');
const { chunkText, buildMetadata } = require('../services/rag/chunkService');

async function runTests() {
    console.log("Running Chunk Service Unit Tests...");

    // Test 1: Small sections
    const smallText = "Section 303\nPunishment for theft.\nSection 304\nPunishment for robbery.";
    const chunks1 = await chunkText(smallText, "doc_1");
    assert.strictEqual(chunks1.length, 2, "Should create exactly 2 chunks");
    assert.strictEqual(chunks1[0].metadata.section, "303");
    assert.strictEqual(chunks1[1].metadata.section, "304");

    // Test 2: Long section (>1200 chars)
    const longTextContent = "A".repeat(3500);
    const longSectionText = "Section 303\n" + longTextContent;
    const chunks2 = await chunkText(longSectionText, "doc_2");
    assert(chunks2.length > 1, "Long section should be split into multiple chunks");
    assert.strictEqual(chunks2[0].metadata.section, "303", "Part 1 should have section 303");
    assert.strictEqual(chunks2[1].metadata.section, "303", "Part 2 should have section 303");

    // Test 3: PDFs without section headings
    const noHeadingsText = "This is a simple text.\nIt has no legal sections.\nJust standard paragraphs.";
    const chunks3 = await chunkText(noHeadingsText, "doc_3");
    assert.strictEqual(chunks3.length, 1);
    assert.strictEqual(chunks3[0].metadata.heading, "General");

    // Test 4: Constitution Articles
    const constText = "Article 21\nProtection of life and personal liberty.\nArticle 22\nProtection against arrest.";
    const chunks4 = await chunkText(constText, "doc_4");
    assert.strictEqual(chunks4.length, 2);
    assert.strictEqual(chunks4[0].metadata.article, "21");
    assert.strictEqual(chunks4[1].metadata.article, "22");

    // Test 5: BNS / BNSS / IPC
    const bnssText = "Chapter IV\nOf Punishments.\nSection 53\nPunishments.";
    const chunks5 = await chunkText(bnssText, "doc_5");
    assert.strictEqual(chunks5.length, 2);
    assert.strictEqual(chunks5[0].metadata.chapter, "IV");
    assert.strictEqual(chunks5[1].metadata.section, "53");

    console.log("All chunkService unit tests passed successfully!");
}

runTests().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
