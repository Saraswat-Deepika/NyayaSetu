const SECTION_REGEX = /(?:^|\n)\s*((?:Section|Sec\.|Article|Chapter|PART|Rule|Clause)\s+[A-Za-z0-9()]+(?:\.[0-9A-Za-z()]+)*)/gi;

const testCases = [
    "This is an intro.\nSection 303 Punishment for theft.\nIt says something.",
    "Article 21 Right to life\nEveryone has the right.",
    "Sec. 45 is another one.",
    "PART II\nFundamental Rights\nChapter I\nGeneral",
    "Clause (a) says this."
];

for (const t of testCases) {
    console.log("----");
    console.log("TEXT:\n" + t);
    const parts = t.split(SECTION_REGEX);
    console.log("PARTS:");
    console.log(parts);
}
