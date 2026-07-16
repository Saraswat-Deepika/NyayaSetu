import React from 'react';

const LegalResponseRenderer = ({ responseText }) => {
    if (!responseText) return null;

    // Split the text by "### " to isolate sections
    const sections = responseText.split('### ').filter(s => s.trim());

    // Helper to process bold text and links
    const processInlineText = (text) => {
        if (!text) return null;
        
        // Simple bold processing for **text**
        let parts = text.split(/(\*\*.*?\*\*)/g);
        
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const renderContent = (content) => {
        const lines = content.split('\n');
        const elements = [];
        let inTable = false;
        let tableHeaders = [];
        let tableRows = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle tables
            if (line.startsWith('|')) {
                inTable = true;
                const row = line.split('|').filter(cell => cell.trim() !== '').map(c => c.trim());
                
                // If it's a separator line like |---|---|
                if (row[0] && row[0].replace(/-/g, '').trim() === '') {
                    continue; // Skip the separator
                }

                if (tableHeaders.length === 0) {
                    tableHeaders = row;
                } else {
                    tableRows.push(row);
                }
                
                // If next line is not a table row, render the table
                const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
                if (!nextLine.startsWith('|')) {
                    elements.push(
                        <div key={`table-${i}`} className="overflow-x-auto mt-4 mb-4">
                            <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {tableHeaders.map((h, idx) => (
                                            <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                {processInlineText(h)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {tableRows.map((row, rIdx) => (
                                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="px-6 py-4 text-sm text-slate-700">
                                                    {processInlineText(cell)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                    inTable = false;
                    tableHeaders = [];
                    tableRows = [];
                }
                continue;
            }

            // Handle Lists
            if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) {
                elements.push(
                    <div key={`list-${i}`} className="flex gap-3 mb-2 items-start">
                        <span className="text-blue-500 font-bold mt-0.5">•</span>
                        <p className="text-slate-700">{processInlineText(line.replace(/^[-*\d.]+\s/, ''))}</p>
                    </div>
                );
                continue;
            }

            // Normal paragraphs
            elements.push(
                <p key={`p-${i}`} className="mb-3 text-slate-700 leading-relaxed">
                    {processInlineText(line)}
                </p>
            );
        }

        return elements;
    };

    return (
        <div className="space-y-6">
            {sections.map((section, idx) => {
                const lines = section.split('\n');
                const title = lines[0].trim();
                const content = lines.slice(1).join('\n').trim();

                return (
                    <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {title}
                            </h3>
                        </div>
                        <div className="p-6">
                            {renderContent(content)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default LegalResponseRenderer;
