const SECTION_REGEX = /(?:^|\n)\s*((?:Section|Sec\.|Article|Chapter|PART|Rule|Clause)\s+[A-Za-z0-9()]+(?:[.\-][A-Za-z0-9()]+)*)/gi;

function extractLegalSections(text) {
    if (!text || typeof text !== 'string') return [];

    const parts = text.split(SECTION_REGEX);
    const sections = [];

    // The first element is the text before any section headings
    const introText = parts[0].trim();
    if (introText) {
        sections.push({
            heading: "General",
            content: introText
        });
    }

    // parts will be structured as: [intro, heading1, content1, heading2, content2, ...]
    for (let i = 1; i < parts.length; i += 2) {
        const heading = parts[i].trim();
        const content = (parts[i + 1] || "").trim();
        
        sections.push({
            heading: heading,
            content: content
        });
    }

    // Post-processing: Merge empty sections if necessary, but returning them as is preserves structure
    return sections.filter(sec => sec.heading || sec.content);
}

module.exports = {
    extractLegalSections,
    SECTION_REGEX
};
