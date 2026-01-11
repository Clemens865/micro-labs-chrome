'use client';

import React, { useState, useEffect } from 'react';
import { Table, Download, Copy, Check, Loader2, RefreshCw, ChevronDown, ChevronUp, FileJson, FileText, FileSpreadsheet, Trash2, Filter, ArrowUpDown, Search, Sparkles } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useToast } from '../../hooks/useToast';
import { useIntegrations } from '../../hooks/useIntegrations';
import SendToIntegrations from '../../components/SendToIntegrations';

interface ExtractedTable {
    id: string;
    name: string;
    headers: string[];
    rows: string[][];
    metadata: {
        rowCount: number;
        colCount: number;
        hasNumericData: boolean;
        possibleTypes: string[];
    };
}

interface TableExtraction {
    id: string;
    timestamp: string;
    source: string;
    tables: ExtractedTable[];
}

const STORAGE_KEY = 'microlabs_data_table_extractor';

export default function DataTableExtractor() {
    const [extractions, setExtractions] = useState<TableExtraction[]>([]);
    const [currentExtraction, setCurrentExtraction] = useState<TableExtraction | null>(null);
    const [selectedTable, setSelectedTable] = useState<ExtractedTable | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<number | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [filterValue, setFilterValue] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const { generateContent } = useGemini();
    const { context } = usePageContext();
    const { success, error: showError } = useToast();
    const { integrations } = useIntegrations();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEY) as { [key: string]: { extractions?: TableExtraction[] } | undefined };
            const stored = data[STORAGE_KEY];
            if (stored?.extractions) setExtractions(stored.extractions);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    };

    const saveData = async (newExtractions?: TableExtraction[]) => {
        try {
            await chrome.storage.local.set({
                [STORAGE_KEY]: { extractions: newExtractions ?? extractions }
            });
        } catch (err) {
            console.error('Failed to save data:', err);
        }
    };

    const extractTables = async () => {
        if (!context?.url) {
            showError('No page context available');
            return;
        }

        setIsExtracting(true);

        try {
            // Extract tables from DOM
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error('No active tab');

            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const tables: { headers: string[]; rows: string[][] }[] = [];

                    // Find all tables
                    document.querySelectorAll('table').forEach((table, tableIndex) => {
                        const headers: string[] = [];
                        const rows: string[][] = [];

                        // Get headers
                        const headerRow = table.querySelector('thead tr') || table.querySelector('tr:first-child');
                        if (headerRow) {
                            headerRow.querySelectorAll('th, td').forEach(cell => {
                                headers.push((cell.textContent || '').trim());
                            });
                        }

                        // Get rows
                        const bodyRows = table.querySelectorAll('tbody tr') || table.querySelectorAll('tr:not(:first-child)');
                        bodyRows.forEach(row => {
                            const rowData: string[] = [];
                            row.querySelectorAll('td').forEach(cell => {
                                rowData.push((cell.textContent || '').trim());
                            });
                            if (rowData.length > 0 && rowData.some(cell => cell)) {
                                rows.push(rowData);
                            }
                        });

                        if (headers.length > 0 || rows.length > 0) {
                            tables.push({ headers, rows });
                        }
                    });

                    // Also look for grid-like structures
                    document.querySelectorAll('[role="grid"], [role="table"]').forEach(grid => {
                        const headers: string[] = [];
                        const rows: string[][] = [];

                        const headerCells = grid.querySelectorAll('[role="columnheader"]');
                        headerCells.forEach(cell => {
                            headers.push((cell.textContent || '').trim());
                        });

                        grid.querySelectorAll('[role="row"]').forEach(row => {
                            const rowData: string[] = [];
                            row.querySelectorAll('[role="gridcell"], [role="cell"]').forEach(cell => {
                                rowData.push((cell.textContent || '').trim());
                            });
                            if (rowData.length > 0) {
                                rows.push(rowData);
                            }
                        });

                        if ((headers.length > 0 || rows.length > 0) && rows.length > 0) {
                            tables.push({ headers, rows });
                        }
                    });

                    return tables;
                }
            });

            const rawTables = results[0]?.result || [];

            if (rawTables.length === 0) {
                showError('No tables found on this page');
                setIsExtracting(false);
                return;
            }

            // Process and enhance tables
            const extractedTables: ExtractedTable[] = rawTables.map((t: { headers: string[]; rows: string[][] }, i: number) => {
                const hasNumericData = t.rows.some((row: string[]) =>
                    row.some((cell: string) => /^\d+([.,]\d+)?%?$/.test(cell.replace(/[$€£¥,\s]/g, '')))
                );

                const possibleTypes: string[] = [];
                if (hasNumericData) possibleTypes.push('Financial', 'Statistics');
                if (t.headers.some((h: string) => /date|time/i.test(h))) possibleTypes.push('Timeline');
                if (t.headers.some((h: string) => /name|email|phone/i.test(h))) possibleTypes.push('Contact List');
                if (t.headers.some((h: string) => /price|cost|amount/i.test(h))) possibleTypes.push('Pricing');

                return {
                    id: `table-${Date.now()}-${i}`,
                    name: `Table ${i + 1}`,
                    headers: t.headers.length > 0 ? t.headers : t.rows[0] || [],
                    rows: t.headers.length > 0 ? t.rows : t.rows.slice(1),
                    metadata: {
                        rowCount: t.rows.length,
                        colCount: Math.max(...t.rows.map((r: string[]) => r.length), t.headers.length),
                        hasNumericData,
                        possibleTypes: possibleTypes.length > 0 ? possibleTypes : ['General']
                    }
                };
            });

            const extraction: TableExtraction = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                source: context.url,
                tables: extractedTables
            };

            setCurrentExtraction(extraction);
            setSelectedTable(extractedTables[0] || null);
            const updated = [extraction, ...extractions].slice(0, 20);
            setExtractions(updated);
            saveData(updated);
            success(`Found ${extractedTables.length} table(s)`);

        } catch (err) {
            console.error('Extraction failed:', err);
            showError('Failed to extract tables');
        } finally {
            setIsExtracting(false);
        }
    };

    const enhanceWithAI = async () => {
        if (!selectedTable) return;

        setIsEnhancing(true);

        try {
            const prompt = `Analyze this table and suggest a better name and clean up the data:

Headers: ${JSON.stringify(selectedTable.headers)}
Sample Rows: ${JSON.stringify(selectedTable.rows.slice(0, 5))}

Provide:
1. A descriptive name for this table
2. Cleaned/normalized headers (standardized naming)
3. Data type for each column
4. Any data quality issues found

Return as JSON:
{
  "suggestedName": "Descriptive table name",
  "cleanedHeaders": ["Header 1", "Header 2", ...],
  "columnTypes": ["string", "number", "date", ...],
  "dataQualityIssues": ["Issue 1", "Issue 2", ...]
}`;

            const response = await generateContent(prompt, undefined, { jsonMode: true });
            const parsed = JSON.parse(response);

            const enhanced: ExtractedTable = {
                ...selectedTable,
                name: parsed.suggestedName || selectedTable.name,
                headers: parsed.cleanedHeaders || selectedTable.headers
            };

            setSelectedTable(enhanced);

            if (currentExtraction) {
                const updatedExtraction = {
                    ...currentExtraction,
                    tables: currentExtraction.tables.map(t =>
                        t.id === selectedTable.id ? enhanced : t
                    )
                };
                setCurrentExtraction(updatedExtraction);
            }

            success('Table enhanced with AI');
        } catch (err) {
            console.error('Enhancement failed:', err);
            showError('Failed to enhance table');
        } finally {
            setIsEnhancing(false);
        }
    };

    const sortTable = (colIndex: number) => {
        if (sortColumn === colIndex) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(colIndex);
            setSortDirection('asc');
        }
    };

    const getSortedRows = () => {
        if (!selectedTable || sortColumn === null) return selectedTable?.rows || [];

        return [...selectedTable.rows].sort((a, b) => {
            const aVal = a[sortColumn] || '';
            const bVal = b[sortColumn] || '';

            // Try numeric comparison
            const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
            const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }

            // String comparison
            return sortDirection === 'asc'
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        });
    };

    const getFilteredRows = () => {
        const sorted = getSortedRows();
        if (!filterValue) return sorted;

        return sorted.filter(row =>
            row.some(cell => cell.toLowerCase().includes(filterValue.toLowerCase()))
        );
    };

    const copyToClipboard = async (format: 'json' | 'csv' | 'tsv' | 'markdown') => {
        if (!selectedTable) return;

        let content = '';
        const rows = getFilteredRows();

        switch (format) {
            case 'json':
                content = JSON.stringify({
                    name: selectedTable.name,
                    headers: selectedTable.headers,
                    rows: rows
                }, null, 2);
                break;
            case 'csv':
                content = [selectedTable.headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
                break;
            case 'tsv':
                content = [selectedTable.headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
                break;
            case 'markdown':
                content = `| ${selectedTable.headers.join(' | ')} |\n| ${selectedTable.headers.map(() => '---').join(' | ')} |\n${rows.map(r => `| ${r.join(' | ')} |`).join('\n')}`;
                break;
        }

        try {
            await navigator.clipboard.writeText(content);
            setCopiedId(format);
            setTimeout(() => setCopiedId(null), 2000);
            success(`Copied as ${format.toUpperCase()}`);
        } catch (err) {
            showError('Failed to copy');
        }
    };

    const downloadFile = (format: 'json' | 'csv') => {
        if (!selectedTable) return;

        let content = '';
        let mimeType = '';
        let extension = '';
        const rows = getFilteredRows();

        if (format === 'json') {
            content = JSON.stringify({
                name: selectedTable.name,
                headers: selectedTable.headers,
                rows: rows,
                metadata: selectedTable.metadata
            }, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        } else {
            content = [selectedTable.headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
            mimeType = 'text/csv';
            extension = 'csv';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTable.name.replace(/\s+/g, '-')}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
        success(`Downloaded as ${extension.toUpperCase()}`);
    };

    const filteredRows = getFilteredRows();

    return (
        <div className="space-y-6">
            {/* Extract Button */}
            <button
                onClick={extractTables}
                disabled={isExtracting}
                className="btn-primary w-full flex items-center justify-center gap-2"
            >
                {isExtracting ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        Extracting Tables...
                    </>
                ) : (
                    <>
                        <Table size={16} />
                        Extract Tables from Page
                    </>
                )}
            </button>

            {/* Tables Found */}
            {currentExtraction && currentExtraction.tables.length > 0 && (
                <div className="space-y-4">
                    {/* Table Selector */}
                    {currentExtraction.tables.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {currentExtraction.tables.map((table, i) => (
                                <button
                                    key={table.id}
                                    onClick={() => {
                                        setSelectedTable(table);
                                        setSortColumn(null);
                                        setFilterValue('');
                                    }}
                                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                        selectedTable?.id === table.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {table.name} ({table.metadata.rowCount} rows)
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Selected Table */}
                    {selectedTable && (
                        <div className="card p-4 space-y-4">
                            {/* Table Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-sm">{selectedTable.name}</h3>
                                    <p className="text-[10px] text-slate-500">
                                        {selectedTable.metadata.rowCount} rows × {selectedTable.metadata.colCount} columns
                                        {selectedTable.metadata.possibleTypes.length > 0 && ` • ${selectedTable.metadata.possibleTypes.join(', ')}`}
                                    </p>
                                </div>
                                <button
                                    onClick={enhanceWithAI}
                                    disabled={isEnhancing}
                                    className="btn-secondary text-xs flex items-center gap-1"
                                >
                                    {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    Enhance
                                </button>
                            </div>

                            {/* Filter */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={filterValue}
                                    onChange={(e) => setFilterValue(e.target.value)}
                                    placeholder="Filter rows..."
                                    className="w-full pl-9 text-xs"
                                />
                            </div>

                            {/* Table View */}
                            <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-800 rounded-lg">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-800 sticky top-0">
                                        <tr>
                                            {selectedTable.headers.map((header, i) => (
                                                <th
                                                    key={i}
                                                    className="px-3 py-2 text-left font-bold text-slate-300 cursor-pointer hover:bg-slate-700"
                                                    onClick={() => sortTable(i)}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        {header || `Col ${i + 1}`}
                                                        {sortColumn === i && (
                                                            <ArrowUpDown size={10} className={sortDirection === 'asc' ? 'rotate-180' : ''} />
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRows.slice(0, 50).map((row, rowIndex) => (
                                            <tr key={rowIndex} className="border-t border-slate-800 hover:bg-slate-800/50">
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="px-3 py-2 text-slate-300">
                                                        {cell || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredRows.length > 50 && (
                                <p className="text-[10px] text-slate-500 text-center">
                                    Showing 50 of {filteredRows.length} rows
                                </p>
                            )}

                            {/* Export Options */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase">Copy As</h4>
                                <div className="flex gap-2">
                                    {(['json', 'csv', 'tsv', 'markdown'] as const).map(format => (
                                        <button
                                            key={format}
                                            onClick={() => copyToClipboard(format)}
                                            className="btn-secondary flex-1 text-xs flex items-center justify-center gap-1"
                                        >
                                            {copiedId === format ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                            {format.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase">Download</h4>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => downloadFile('csv')}
                                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                                    >
                                        <FileSpreadsheet size={14} />
                                        CSV
                                    </button>
                                    <button
                                        onClick={() => downloadFile('json')}
                                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                                    >
                                        <FileJson size={14} />
                                        JSON
                                    </button>
                                </div>
                            </div>

                            {/* Send to Integrations */}
                            <SendToIntegrations
                                appId="data-table-extractor"
                                appName="Data Table Extractor"
                                data={{
                                    tableName: selectedTable.name,
                                    headers: selectedTable.headers,
                                    rowCount: selectedTable.metadata.rowCount,
                                    sampleRows: selectedTable.rows.slice(0, 5)
                                }}
                                source={{ url: context?.url }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* History */}
            {extractions.length > 0 && (
                <div className="card p-4 space-y-3">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between"
                    >
                        <h3 className="text-sm font-bold">Previous Extractions ({extractions.length})</h3>
                        {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showHistory && (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {extractions.slice(0, 10).map(ext => (
                                <div
                                    key={ext.id}
                                    className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800"
                                    onClick={() => {
                                        setCurrentExtraction(ext);
                                        setSelectedTable(ext.tables[0] || null);
                                    }}
                                >
                                    <div className="text-xs">
                                        <div className="font-medium truncate max-w-[180px]">
                                            {new URL(ext.source).hostname}
                                        </div>
                                        <div className="text-slate-500">{ext.tables.length} table(s)</div>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        {new Date(ext.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!currentExtraction && !isExtracting && (
                <div className="text-center py-12 text-slate-500">
                    <Table size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Navigate to a page with tables and click extract</p>
                </div>
            )}
        </div>
    );
}
