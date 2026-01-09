import React from 'react';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

// Simple markdown parser that converts common markdown to HTML/React elements
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    const parseMarkdown = (text: string): React.ReactNode[] => {
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];
        let listItems: string[] = [];
        let listType: 'ul' | 'ol' | null = null;
        let inCodeBlock = false;
        let codeBlockContent: string[] = [];
        let codeBlockLang = '';

        const flushList = () => {
            if (listItems.length > 0 && listType) {
                const ListTag = listType;
                elements.push(
                    <ListTag key={elements.length} className={listType === 'ul' ? 'list-disc pl-5 space-y-1 my-3' : 'list-decimal pl-5 space-y-1 my-3'}>
                        {listItems.map((item, i) => (
                            <li key={i} className="text-zinc-300">{parseInline(item)}</li>
                        ))}
                    </ListTag>
                );
                listItems = [];
                listType = null;
            }
        };

        const parseInline = (line: string): React.ReactNode => {
            // Handle inline code first (before bold/italic to avoid conflicts)
            line = line.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-zinc-800 text-emerald-400 rounded text-xs font-mono">$1</code>');

            // Handle bold
            line = line.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');

            // Handle italic
            line = line.replace(/\*([^*]+)\*/g, '<em class="italic text-zinc-200">$1</em>');

            // Handle links
            line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>');

            return <span dangerouslySetInnerHTML={{ __html: line }} />;
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Code blocks
            if (line.startsWith('```')) {
                if (inCodeBlock) {
                    flushList();
                    elements.push(
                        <pre key={elements.length} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 overflow-x-auto my-3">
                            <code className="text-xs font-mono text-emerald-400">
                                {codeBlockContent.join('\n')}
                            </code>
                        </pre>
                    );
                    codeBlockContent = [];
                    inCodeBlock = false;
                } else {
                    flushList();
                    inCodeBlock = true;
                    codeBlockLang = line.slice(3).trim();
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockContent.push(line);
                continue;
            }

            // Empty line
            if (line.trim() === '') {
                flushList();
                continue;
            }

            // Headers
            const h1Match = line.match(/^#\s+(.+)$/);
            const h2Match = line.match(/^##\s+(.+)$/);
            const h3Match = line.match(/^###\s+(.+)$/);
            const h4Match = line.match(/^####\s+(.+)$/);

            if (h1Match) {
                flushList();
                elements.push(<h1 key={elements.length} className="text-xl font-bold text-white mt-4 mb-2">{parseInline(h1Match[1])}</h1>);
                continue;
            }
            if (h2Match) {
                flushList();
                elements.push(<h2 key={elements.length} className="text-lg font-bold text-white mt-4 mb-2">{parseInline(h2Match[1])}</h2>);
                continue;
            }
            if (h3Match) {
                flushList();
                elements.push(<h3 key={elements.length} className="text-base font-semibold text-white mt-3 mb-1">{parseInline(h3Match[1])}</h3>);
                continue;
            }
            if (h4Match) {
                flushList();
                elements.push(<h4 key={elements.length} className="text-sm font-semibold text-zinc-200 mt-2 mb-1">{parseInline(h4Match[1])}</h4>);
                continue;
            }

            // Horizontal rule
            if (line.match(/^[-*_]{3,}$/)) {
                flushList();
                elements.push(<hr key={elements.length} className="border-zinc-700 my-4" />);
                continue;
            }

            // Table detection (starts with |)
            if (line.startsWith('|') && line.endsWith('|')) {
                flushList();
                // Collect all table rows
                const tableRows: string[] = [line];
                let j = i + 1;
                while (j < lines.length && lines[j].startsWith('|') && lines[j].endsWith('|')) {
                    tableRows.push(lines[j]);
                    j++;
                }
                i = j - 1; // Skip processed lines

                // Parse table
                const parsedRows = tableRows.map(row =>
                    row.split('|').slice(1, -1).map(cell => cell.trim())
                );

                // Check if second row is separator (---)
                const hasSeparator = parsedRows.length > 1 && parsedRows[1].every(cell => /^[-:]+$/.test(cell));
                const headerRow = hasSeparator ? parsedRows[0] : null;
                const bodyRows = hasSeparator ? parsedRows.slice(2) : parsedRows;

                elements.push(
                    <div key={elements.length} className="overflow-x-auto my-3">
                        <table className="w-full text-xs border-collapse">
                            {headerRow && (
                                <thead>
                                    <tr className="border-b border-zinc-700">
                                        {headerRow.map((cell, idx) => (
                                            <th key={idx} className="px-3 py-2 text-left font-semibold text-white bg-zinc-800/50">
                                                {parseInline(cell)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                            )}
                            <tbody>
                                {bodyRows.map((row, rowIdx) => (
                                    <tr key={rowIdx} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                                        {row.map((cell, cellIdx) => (
                                            <td key={cellIdx} className="px-3 py-2 text-zinc-300">
                                                {parseInline(cell)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
                continue;
            }

            // Blockquote
            const blockquoteMatch = line.match(/^>\s*(.*)$/);
            if (blockquoteMatch) {
                flushList();
                elements.push(
                    <blockquote key={elements.length} className="border-l-2 border-blue-500 pl-3 py-1 my-2 text-zinc-400 italic">
                        {parseInline(blockquoteMatch[1])}
                    </blockquote>
                );
                continue;
            }

            // Unordered list
            const ulMatch = line.match(/^[-*+]\s+(.+)$/);
            if (ulMatch) {
                if (listType !== 'ul') flushList();
                listType = 'ul';
                listItems.push(ulMatch[1]);
                continue;
            }

            // Ordered list
            const olMatch = line.match(/^\d+\.\s+(.+)$/);
            if (olMatch) {
                if (listType !== 'ol') flushList();
                listType = 'ol';
                listItems.push(olMatch[1]);
                continue;
            }

            // Regular paragraph
            flushList();
            elements.push(
                <p key={elements.length} className="text-zinc-300 my-2 leading-relaxed">
                    {parseInline(line)}
                </p>
            );
        }

        // Flush any remaining list
        flushList();

        return elements;
    };

    return (
        <div className={`markdown-content ${className}`}>
            {parseMarkdown(content)}
        </div>
    );
};

export default MarkdownRenderer;
